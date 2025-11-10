import { Body, Controller, Ip, Post, Get, Query } from '@nestjs/common';
import { PixelService } from './pixel.service';
import { CreateUserPixelDTO } from './dto';

@Controller('pixel')
export class PixelController {
  constructor(private readonly pixelService: PixelService) {}

  @Post('create')
  async createUserPixel(
    @Body() dto: CreateUserPixelDTO,
    @Ip() clientIp: string,
  ): Promise<string> {
    return await this.pixelService.createUserPixel(dto, clientIp);
  }

  @Get('send-event')
  async sendUserEvent(
    @Query('ip') clientIp: string,
    @Query('agent') agent: string,
    @Query('event_name') event_name: string,
    @Query('fbclid') fbclid: string,
    @Query('pixel') pixel: string,
    @Query('test_event_code') test_event_code?: string,
  ): Promise<string> {
    console.log('Pixel.Controller.fbclid', fbclid);

    return await this.pixelService.sendUserEvent(
      clientIp,
      event_name,
      fbclid,
      pixel,
      test_event_code ?? null,
    );
  }

  @Post('create-fb-event')
  async createFBUserEvent(
    @Ip() clientIp: string,
    @Query('event_name') eventName: string,
    @Query('fbclid') fbclid: string,
    @Query('type_source') typeSource: string,
    @Query('pixel_id') pixelId?: string,
    @Query('sub_id') subId?: string,
    @Query('event_source_url') eventSourceUrl?: string,
    @Query('test_event_code') testEventCode?: string,
    @Query('client_user_agent') clientUserAgent?: string,
    @Query('referrer') referrer?: string,
  ): Promise<string> {
    return await this.pixelService.createFBUserEvent(
      clientIp,
      eventName,
      fbclid,
      typeSource,
      pixelId ?? null,
      subId ?? null,
      eventSourceUrl ?? null,
      testEventCode ?? null,
      clientUserAgent ?? null,
      referrer ?? null,
    );
  }

  @Post('create-tt-event')
  async createTTUserEvent(
    @Ip() clientIp: string,
    @Query('event_name') eventName: string,
    @Query('fbclid') fbclid: string,
    @Query('type_source') typeSource: string,
    @Query('pixel_id') pixelId?: string,
    @Query('sub_id') subId?: string,
    @Query('event_source_url') eventSourceUrl?: string,
    @Query('test_event_code') testEventCode?: string,
    @Query('client_user_agent') clientUserAgent?: string,
    @Query('referrer') referrer?: string,
    @Query('token') token?: string,

    // @Query('token') token?: string,
  ): Promise<string> {
    return await this.pixelService.createTTUserEvent(
      clientIp,
      eventName,
      fbclid,
      (typeSource = 'TitTok'),
      pixelId ?? null,
      subId ?? null,
      eventSourceUrl ?? null,
      testEventCode ?? null,
      clientUserAgent ?? null,
      referrer ?? null,
      token ?? null,
    );
  }
}
