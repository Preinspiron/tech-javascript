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
    console.log('Pixei.Controller', fbclid);

    return await this.pixelService.sendUserEvent(
      event_name,
      fbclid,
      test_event_code ?? null,
    );
  }
}
