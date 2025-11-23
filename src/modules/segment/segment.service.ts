import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import axios from 'axios';
import * as crypto from 'crypto';
import { Segment } from './models/segment.model';
import { generateRandomString } from '@helpers/fb';

@Injectable()
export class SegmentService {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Segment) private readonly segmentModel: typeof Segment,
  ) {}

  private segmentUrl = this.configService.get<string>('segment_url');
  private segmentKey = this.configService.get<string>('segment_key');

  // Хеширование данных для external_id (SHA256)
  private hashData(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data.toLowerCase().trim())
      .digest('hex');
  }

  private async getSubid(subid: string) {
    return await this.segmentModel.findOne({ where: { userId: subid } });
  }

   private KeitatoConvertionStatus(status: string): string {
    switch (status) {
      case 'reg':
      case 'registration':
        return 'CompleteRegistration';
      case 'dep':
      case 'deposit':
      case 'sale':
        return 'Purchase';
      default:
        return 'Purchase';
    }
  }

  async sendTrackEvent(params: {
    status?: string;
    subid?: string;
    value?: string;
    UA?: string;
    origin?: string;
    ip?: string;
  }): Promise<any> {
    if (!params.subid) {
      return 'subid is required';
    }

    let segmentRecord: Segment;
    const userRecord = await this.getSubid(params.subid);
    // Если нет subid, создаем новую запись в БД
    if (!userRecord.userId) {
      const external_id = this.hashData(params.subid);

      segmentRecord = await this.segmentModel.create({
        userId: params.subid,
        ip: params.ip || '127.0.0.1',
        origin: params.origin || 'https://traffband.info',
        external_id,
        event: this.KeitatoConvertionStatus(params.status),
        type: 'track',
        value: params.value || '0.1',
        writeKey: this.segmentKey,
        UA:
          params.UA ||
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        keitato_status: params.status || null,
      });
    }

    // Формируем payload для отправки в Segment
    const payload: Record<string, any> = {
      userId: segmentRecord.userId,
      event: this.KeitatoConvertionStatus(params.status) || segmentRecord.event,
      type: segmentRecord.type || 'track',
      timestamp: Date.now(),
      user_data: {
        externalId: segmentRecord.external_id,
        ...(segmentRecord.ip && {
          client_ip_address: segmentRecord.ip,
        }),
        ...(segmentRecord.UA && {
          client_user_agent: segmentRecord.UA,
        }),
      },
      value: params.value || segmentRecord.value || '1',
      context: {
        userAgent: segmentRecord.UA,
        psge: { url: segmentRecord.origin },
      },
      writeKey: segmentRecord.writeKey
    };

    
    try {
      const response = await axios.post(this.segmentUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if( response.status === 200){
         await this.segmentModel.update({
          segment_status: "success",
        }, { where: { userId: segmentRecord.userId } });
      }
      
      return response.data;
    } catch (error) {
      console.error('Error sending data to Segment:', error);
      throw new InternalServerErrorException(
        'Failed to send data to Segment.io',
      );
    }
  }
}
