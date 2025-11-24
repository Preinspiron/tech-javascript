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

  private segmentUrl = this.configService.get<string>('SEGMENT_URL');
  private segmentKey = this.configService.get<string>('SEGMENT_KEY');

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

  private generateTimestamp(): number {
    return Date.now();
  }

  private generateFbc(timestamp: number, fbclid: string): string {
    if (!fbclid) {
      return null;
    }
    return `fb.1.${timestamp}.${fbclid}`;
  }

  private generateFbp(timestamp: number): string {
    return `fb.1.${timestamp}.${generateRandomString(10)}`;
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
    fbclid?: string;
  }): Promise<any> {
    if (!params.subid) {
      return 'subid is required';
    }
    console.log(this.segmentUrl, this.segmentKey);
    let segmentRecord: Segment;
    const userRecord = await this.getSubid(params.subid);

    // Если запись не найдена, создаем новую запись в БД
    if (!userRecord) {
      const external_id = this.hashData(params.subid);
      const timestamp = this.generateTimestamp();
      const fbc = this.generateFbc(timestamp, params.fbclid);
      const fbp = this.generateFbp(timestamp);

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
        fbc,
        fbp,
      });
      console.log('segmentRecord', segmentRecord);
    } else {
      // Используем существующую запись - берем fbc и fbp из БД (они должны быть постоянными)
      segmentRecord = userRecord;

      // Обновляем данные если они переданы
      if (params.status) segmentRecord.keitato_status = params.status;
      if (params.value) segmentRecord.value = params.value;
      if (params.UA) segmentRecord.UA = params.UA;
      if (params.origin) segmentRecord.origin = params.origin;
      if (params.ip) segmentRecord.ip = params.ip;

      // Генерируем fbc и fbp ТОЛЬКО если их еще нет в БД
      // Эти значения должны быть постоянными для пользователя и не перегенерироваться при каждом событии
      if (params.fbclid && !segmentRecord.fbc) {
        const timestamp = this.generateTimestamp();
        segmentRecord.fbc = this.generateFbc(timestamp, params.fbclid);
      }
      if (!segmentRecord.fbp) {
        const timestamp = this.generateTimestamp();
        segmentRecord.fbp = this.generateFbp(timestamp);
      }

      await segmentRecord.save();
    }

    // Формируем payload для отправки в Segment
    const payload: Record<string, any> = {
      userId: segmentRecord.userId,
      messageId: segmentRecord.userId + '.' + Date.now(),
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
        ...(segmentRecord.fbc && {
          fbc: segmentRecord.fbc,
        }),
        ...(segmentRecord.fbp && {
          fbp: segmentRecord.fbp,
        }),
      },
      value: params.value || segmentRecord.value || '1',
      currency: 'USD',
      context: {
        userAgent: segmentRecord.UA,
        page: { url: segmentRecord.origin },
      },
      writeKey: segmentRecord.writeKey,
    };

    try {
      console.log('payload', payload);

      const response = await axios.post(this.segmentUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.status === 200) {
        await this.segmentModel.update(
          {
            segment_status: 'success',
            event:
              this.KeitatoConvertionStatus(params.status) ||
              segmentRecord.event,
          },
          { where: { userId: segmentRecord.userId } },
        );
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
