import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { Attributes } from 'sequelize';
import { EventService } from '../event/event.service';
import { Pixel } from './models/pixel.model';
import { Event } from '../event/models/event.model';
import { CreateUserPixelDTO } from './dto';
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { generateRandomString } from '@helpers/fb';
import { FB, TT } from '../../common/constants/pixel';
import * as crypto from 'crypto';

console.log('start server');

axiosRetry(axios, {
  retries: 5,
  retryDelay: (retryCount) => retryCount * 1000,
  retryCondition: (error) =>
    axiosRetry.isNetworkOrIdempotentRequestError(error),
});

@Injectable()
export class PixelService {
  constructor(
    private readonly eventService: EventService,
    private readonly configService: ConfigService,
    @InjectModel(Pixel) private readonly pixelModel: typeof Pixel,
  ) {}

  private signalUrl = this.configService.get<string>('signal_url');
  private ttUrl: string = this.configService.get<string>('tt_url');
  private ttToken: string = this.configService.get<string>('tt_token');

  private generateTimestamp(): number {
    return Date.now();
  }

  private generateRandomString = generateRandomString;

  private generateFbc(timestamp: number, fbclid: string): string {
    return `fb.1.${timestamp}.${fbclid}`;
  }

  private generateFbp(timestamp: number): string {
    return `fb.1.${timestamp}.${this.generateRandomString(10)}`;
  }

  private generateTTEventID(timestamp: number): string {
    return `event_${Math.random().toString(36).substring(2, 9)}_${Math.floor(
      timestamp / 1000,
    )}`;
  }

  private generateFBEventID(timestamp: number): string {
    return `event.id.${Math.floor(timestamp / 1000)}`;
  }

  // Хеширование данных для CAPI (SHA256)
  private hashData(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data.toLowerCase().trim())
      .digest('hex');
  }

  // Генерация моков для недостающих данных
  private generateMockEmail(fbclid: string): string {
    // Генерируем мок email на основе fbclid для консистентности
    const mockEmail = `user_${fbclid}@example.com`;
    return this.hashData(mockEmail);
  }

  private generateMockPhone(fbclid: string): string {
    // Генерируем мок phone на основе fbclid для консистентности
    const mockPhone = `+1234567890${fbclid.slice(-4)}`;
    return this.hashData(mockPhone);
  }

  private generateMockMadid(fbclid: string): string {
    // Генерируем мок Mobile Advertiser ID на основе fbclid
    return `madid_${fbclid}_${this.generateRandomString(8)}`;
  }

  private createFacebookData(
    event: Attributes<Event>,
    pixel: Attributes<Pixel>,
  ) {
    // Генерируем моки для недостающих данных на основе fbclid для консистентности
    const mockEmail = this.generateMockEmail(pixel.fbclid);
    const mockPhone = this.generateMockPhone(pixel.fbclid);
    const mockMadid = this.generateMockMadid(pixel.fbclid);

    const facebookData = {
      data: [
        {
          action_source:
            this.configService.get<string>('action_source') || 'website',
          event_name: event.event_name,
          event_time: event.event_time,
          event_id: event.event_id,
          event_source_url: pixel.event_source_url || 'https://traffband.info',
          data_processing_options: ['GDPR'],
          data_processing_options_country: '1',
          data_processing_options_state: '1000',
          user_data: {
            madid: [mockMadid],
            email: [mockEmail],
            phone: [mockPhone],
            client_ip_address: pixel.client_ip_address || null,
          },
          custom_data: undefined as
            | {
                currency: string;
                value: number;
                num_items?: number;
                content_ids?: string[];
                content_type?: string;
              }
            | undefined,
          app_data: {
            advertiser_tracking_enabled: true,
            application_tracking_enabled: true,
          },
        },
      ],
      ...(event.test_event_code
        ? { test_event_code: event.test_event_code }
        : {}),
    };

    if (event.event_name in FB) {
      const fbCustomData = FB[event.event_name];
      facebookData.data[0].custom_data = {
        currency: fbCustomData.currency || 'USD',
        value: fbCustomData.value || 0,
        ...(fbCustomData.content_ids && {
          content_ids: fbCustomData.content_ids,
        }),
        ...(fbCustomData.content_type && {
          content_type: fbCustomData.content_type,
        }),
        // Добавляем num_items для соответствия официальному шаблону
        num_items: 1,
      };
      if (event.event_name === 'ViewContent') {
        facebookData.data[0].event_id = event.event_id + 1;
      }
    }

    return facebookData;
  }

  private createTTData(
    event: Attributes<Event>,
    pixel: Attributes<Pixel>,
    timestamp: number,
  ) {
    return {
      event_source: 'web',
      event_source_id: pixel.pixel_id,
      data: [
        {
          event: event.event_name,
          event_id: event.event_id,
          event_time: Math.floor(timestamp / 1000),
          user: {
            external_id: `user_${pixel.sub_id}`,
            ttclid: pixel.fbclid,
            ip: pixel.client_ip_address,
            user_agent: pixel.client_user_agent,
          },
          ...(TT[event.event_name] ? { properties: TT[event.event_name] } : {}),
          page: {
            url: pixel.event_source_url,
            referrer: pixel.referrer,
          },
        },
      ],
      ...(event.test_event_code
        ? { test_event_code: event.test_event_code }
        : {}),
    };
  }

  private createEventData(
    pixel: Attributes<Pixel>,
    eventName: string,
    timestamp: number,
    testEventCode: string | undefined,
  ): Omit<Attributes<Event>, 'id'> {
    return {
      user_id: pixel.id,
      event_name: eventName,
      event_id:
        pixel.type_source === 'FB'
          ? this.generateFBEventID(timestamp)
          : this.generateTTEventID(timestamp),
      event_time: Math.floor(timestamp / 1000).toString(),
      event_source_url: pixel.event_source_url || null,
      test_event_code: testEventCode || null,
      type_source: pixel.type_source,
    };
  }

  async createUserPixel(dto: CreateUserPixelDTO, clientIp: string) {
    try {
      const timestamp = this.generateTimestamp();

      const pixelData = {
        pixel_id: dto.pixel_id,
        fbclid: dto.fbclid,
        client_ip_address: clientIp || null,
        client_user_agent: dto.client_user_agent || null,
        sub_id: dto.sub_id,
        fbc: this.generateFbc(timestamp, dto.fbclid),
        fbp: this.generateFbp(timestamp),
        event_source_url: dto.event_source_url,
        type_source: dto.type_source || null,
        referrer: dto.referrer || null,
      };

      const userPixelData = await this.pixelModel.create(pixelData);

      const eventData: Omit<Attributes<Event>, 'id'> = {
        user_id: userPixelData.id,
        event_name: dto.event_name,
        event_id: `event.id.${Math.floor(timestamp / 1000)}`,
        event_time: Math.floor(timestamp / 1000).toString(),
        test_event_code: dto.test_event_code || null,
        type_source: userPixelData.type_source || null,
      };

      const userEventData = await this.eventService.createEvent(eventData);

      // Используем единый метод createFacebookData для соответствия официальному шаблону Stape
      const facebookData = this.createFacebookData(
        userEventData,
        userPixelData,
      );

      const signalUrl = this.configService.get<string>('signal_url');

      await axios.post(
        signalUrl + userPixelData.pixel_id + '/events',
        facebookData,
      );

      return 'Pixel created successfully';
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to process pixel: ${error.message}`,
      );
    }
  }

  async sendUserEvent(
    clientIp: string,
    eventName: string,
    fbclid: string,
    pixel: string,
    testEventCode?: string,
  ) {
    try {
      console.log('sendUserEvent');

      const timestamp = this.generateTimestamp();

      // Ищем pixel по комбинации pixel_id И fbclid, чтобы для каждого нового fbclid создавалась отдельная запись
      const [existUserPixel, created] = await this.pixelModel.findOrCreate({
        where: {
          pixel_id: pixel,
          fbclid: fbclid,
        },
        defaults: {
          pixel_id: pixel,
          fbclid: fbclid,
          client_ip_address: clientIp || null,
          client_user_agent: null,
          sub_id: null,
          fbc: this.generateFbc(timestamp, fbclid),
          fbp: this.generateFbp(timestamp),
          event_source_url: null,
          type_source: 'FB',
          referrer: null,
        },
      });

      // Если pixel был создан, логируем для отладки
      if (created) {
        console.log(
          'New pixel created:',
          existUserPixel.id,
          'for fbclid:',
          fbclid,
        );
      } else {
        console.log(
          'Existing pixel found:',
          existUserPixel.id,
          'for fbclid:',
          fbclid,
        );
      }

      // Создаем событие, связанное с pixel
      const eventData: Omit<Attributes<Event>, 'id'> = {
        user_id: existUserPixel.id,
        event_name: eventName,
        event_id: `event.id.${Math.floor(timestamp / 1000)}`,
        event_time: Math.floor(timestamp / 1000).toString(),
        event_source_url: existUserPixel.event_source_url,
        test_event_code: testEventCode || null,
        type_source: existUserPixel.type_source || null,
      };

      const userEventData = await this.eventService.createEvent(eventData);

      // Используем единый метод createFacebookData для соответствия официальному шаблону Stape
      const facebookData = this.createFacebookData(
        userEventData,
        existUserPixel,
      );

      const facebookUserData = await axios.post(
        this.signalUrl + existUserPixel.pixel_id + '/events',
        facebookData,
      );

      console.log('facebookUserData', facebookUserData);

      return 'Event send successfully';
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to process send event: ${error}`,
      );
    }
  }

  async createFBUserEvent(
    clientIp: string,
    eventName: string,
    fbclid: string,
    typeSource: string,
    pixelId?: string,
    subId?: string,
    eventSourceUrl?: string,
    testEventCode?: string,
    clientUserAgent?: string,
    referrer?: string,
  ) {
    try {
      const existUserPixel = await this.pixelModel.findOne({
        where: { fbclid: fbclid },
      });

      const timestamp = this.generateTimestamp();

      if (!existUserPixel) {
        const pixelData = {
          pixel_id: pixelId,
          fbclid: fbclid,
          client_ip_address: clientIp || null,
          client_user_agent: clientUserAgent || null,
          sub_id: subId,
          fbc: this.generateFbc(timestamp, fbclid),
          fbp: this.generateFbp(timestamp),
          event_source_url: eventSourceUrl,
          type_source: typeSource,
          referrer: referrer || null,
        };

        const userPixelData = await this.pixelModel.create(pixelData);

        const eventData = this.createEventData(
          userPixelData,
          eventName,
          timestamp,
          testEventCode,
        );

        const userEventData = await this.eventService.createEvent(eventData);

        const facebookData = this.createFacebookData(
          userEventData,
          userPixelData,
        );

        await axios.post(
          this.signalUrl + userPixelData.pixel_id + '/events',
          facebookData,
        );

        return 'Pixel created successfully';
      }

      const eventData = this.createEventData(
        existUserPixel,
        eventName,
        timestamp,
        testEventCode,
      );

      const newUserEventData = await this.eventService.createEvent(eventData);

      const facebookData = this.createFacebookData(
        newUserEventData,
        existUserPixel,
      );

      await axios.post(
        this.signalUrl + existUserPixel.pixel_id + '/events',
        facebookData,
      );

      return 'Event send successfully';
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to process send event or create pixel: ${error.message}`,
      );
    }
  }

  async createTTUserEvent(
    clientIp: string,
    eventName: string,
    fbclid: string,
    typeSource?: string,
    pixelId?: string,
    subId?: string,
    eventSourceUrl?: string,
    testEventCode?: string,
    clientUserAgent?: string,
    referrer?: string,
    token?: string,
  ) {
    try {
      const existUserPixel = await this.pixelModel.findOne({
        where: { fbclid: fbclid },
      });

      const timestamp = this.generateTimestamp();

      if (!existUserPixel) {
        const pixelData = {
          pixel_id: pixelId,
          fbclid: fbclid,
          client_ip_address: clientIp || null,
          client_user_agent: clientUserAgent || null,
          sub_id: subId || 'no sub',
          event_source_url: eventSourceUrl || 'tiktok.com',
          type_source: typeSource || 'TikTok',
          referrer: referrer || null,
        };

        const userPixelData = await this.pixelModel.create(pixelData);

        const eventData = this.createEventData(
          userPixelData,
          eventName,
          timestamp,
          testEventCode,
        );

        const userEventData = await this.eventService.createEvent(eventData);

        const ttData = this.createTTData(
          userEventData,
          userPixelData,
          timestamp,
        );

        // console.log('ttData', ttData);
        const response = await axios.post(this.ttUrl, ttData, {
          headers: {
            'Access-Token': ` ${token}`,
            'Content-Type': 'application/json',
          },
        });
        // console.log('Custom->TT server response ', response);
        return 'Pixel created successfully';
      }

      const eventData = this.createEventData(
        existUserPixel,
        eventName,
        timestamp,
        testEventCode,
      );

      const newUserEventData = await this.eventService.createEvent(eventData);

      const ttData = this.createTTData(
        newUserEventData,
        existUserPixel,
        timestamp,
      );
      //   console.log('ttData2', ttData.data[0].properties);

      await axios.post(this.ttUrl, ttData, {
        headers: {
          'Access-Token': ` ${token}`,
          //   'Access-Token': token,
          'Content-Type': 'application/json',
        },
      });

      return 'Event send successfully';
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to process send event or create pixel: ${error.message}`,
      );
    }
  }
}
