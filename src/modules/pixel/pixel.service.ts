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
import { CUSTOM_DATA_MAP } from '../../common/constants/pixel';

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

  signalUrl = this.configService.get<string>('signal_url');

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

  private createFacebookData(
    event: Attributes<Event>,
    pixel: Attributes<Pixel>,
  ) {
    const facebookData = {
      data: [
        {
          event_name: event.event_name,
          event_id: event.event_id,
          event_time: event.event_time,
          event_source_url: pixel.event_source_url,
          data_source_id: pixel.pixel_id,
          user_data: {
            client_ip_address: pixel.client_ip_address,
            client_user_agent: pixel.client_user_agent,
            fbc: pixel.fbc,
            fbp: pixel.fbp,
          },
          action_source: this.configService.get<string>('action_source'),
          custom_data: undefined as
            | {
                currency: string;
                value: number;
                content_ids: string[];
                content_type: string;
              }
            | undefined,
        },
      ],
      ...(event.test_event_code
        ? { test_event_code: event.test_event_code }
        : {}),
    };

    if (event.event_name in CUSTOM_DATA_MAP) {
      facebookData.data[0].custom_data = CUSTOM_DATA_MAP[event.event_name];
      if (event.event_name === 'ViewContent') {
        facebookData.data[0].event_id = event.event_id + 1;
      }
    }

    return facebookData;
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
      event_id: `event.id.${Math.floor(timestamp / 1000)}`,
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

      const facebookData = {
        data: [
          {
            event_name: userEventData.event_name,
            event_id: userEventData.event_id,
            event_time: userEventData.event_time,
            event_source_url: userPixelData.event_source_url,
            data_source_id: userPixelData.pixel_id,
            user_data: {
              client_ip_address: userPixelData.client_ip_address,
              client_user_agent: userPixelData.client_user_agent,
              fbc: userPixelData.fbc,
              fbp: userPixelData.fbp,
            },
            action_source: this.configService.get<string>('action_source'),
            custom_data: undefined as { [key: string]: any } | undefined,
          },
        ],
        ...(userEventData.test_event_code
          ? { test_event_code: userEventData.test_event_code }
          : {}),
      };

      if (userEventData.event_name === 'PageView') {
        facebookData.data[0].custom_data = {
          currency: 'USD',
          value: 0.01,
          content_ids: ['product.id.123'],
          content_type: 'product',
        };
      }

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
    eventName: string,
    fbclid: string,
    testEventCode?: string,
  ) {
    try {
      const existUserPixel = await this.pixelModel.findOne({
        where: { fbclid: fbclid },
      });

      if (!existUserPixel)
        throw new BadRequestException('Not found user pixel');

      const timestamp = this.generateTimestamp();

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

      const facebookData = {
        data: [
          {
            event_name: userEventData.event_name,
            event_id: userEventData.event_id,
            event_time: userEventData.event_time,
            event_source_url: existUserPixel.event_source_url,
            data_source_id: existUserPixel.pixel_id,
            user_data: {
              client_ip_address: existUserPixel.client_ip_address,
              client_user_agent: existUserPixel.client_user_agent,
              fbc: existUserPixel.fbc,
              fbp: existUserPixel.fbp,
            },
            action_source: this.configService.get<string>('action_source'),
            custom_data: undefined as { [key: string]: any } | undefined,
          },
        ],
        ...(userEventData.test_event_code
          ? { test_event_code: userEventData.test_event_code }
          : {}),
      };

      if (userEventData.event_name === 'PageView') {
        facebookData.data[0].custom_data = {
          currency: 'USD',
          value: 0.01,
          content_ids: ['product.id.123'],
          content_type: 'product',
        };
      }

      if (userEventData.event_name === 'Lead') {
        facebookData.data[0].custom_data = {
          currency: 'USD',
          value: 0.04,
          content_ids: ['product.id.123'],
          content_type: 'product',
        };
      }
      if (userEventData.event_name === 'ViewContent') {
        facebookData.data[0].custom_data = {
          currency: 'USD',
          value: 0.1,
          content_ids: ['product.id.123'],
          content_type: 'product',
        };

        facebookData.data[0].event_id = userEventData.event_id + 1;
      }

      if (userEventData.event_name === 'CompleteRegistration') {
        facebookData.data[0].custom_data = {
          currency: 'USD',
          value: 2.0,
          content_ids: ['product.id.123'],
          content_type: 'product',
        };
      }

      if (userEventData.event_name === 'Purchase') {
        facebookData.data[0].custom_data = {
          currency: 'USD',
          value: 20.0,
          content_ids: ['product.id.123'],
          content_type: 'product',
        };
      }

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

  async sendUserEventTest(
    clientIp: string,
    eventName: string,
    fbclid: string,
    typeSource: string,
    pixelId?: string,
    subId?: string,
    eventSourceUrl?: string,
    testEventCode?: string,
    clientUserAgent?: string,
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

      const facebookUserData = await axios.post(
        this.signalUrl + existUserPixel.pixel_id + '/events',
        facebookData,
      );

      console.log('facebookUserData', facebookUserData);

      return 'Event send successfully';
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to process send event or create pixel: ${error.message}`,
      );
    }
  }
}
