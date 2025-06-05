import { Body, Controller, Ip, Post, Query } from '@nestjs/common';
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

  @Post('send-event')
  async sendUserEvent(
    @Query('event_name') event_name: string,
    @Query('fbclid') fbclid: string,
    @Query('test_event_code') test_event_code?: string,
  ): Promise<string> {
    console.log('Pixel.Controller.fbclid', fbclid);

    return await this.pixelService.sendUserEvent(
      event_name,
      fbclid,
      test_event_code ?? null,
    );
  }

  @Post('send-event-test')
  async sendUserEventTest(
    @Ip() clientIp: string,
    @Query('event_name') event_name: string,
    @Query('fbclid') fbclid: string,
    @Query('event_name') pixel_id?: string,
    @Query('event_name') sub_id?: string,
    @Query('event_name') event_source_url?: string,
    @Query('test_event_code') test_event_code?: string,
    @Query('event_name') client_user_agent?: string,
  ): Promise<string> {
    console.log('Pixel.Controller.fbclid', fbclid);

    return await this.pixelService.sendUserEventTest(
      clientIp,
      event_name,
      fbclid,
      pixel_id ?? null,
      sub_id ?? null,
      event_source_url ?? null,
      test_event_code ?? null,
      client_user_agent ?? null,
    );
  }
}
