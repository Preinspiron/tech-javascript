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
    @Query('sub_id') sub_id: string,
    @Query('test_event_code') test_event_code?: string,
  ): Promise<string> {
    return await this.pixelService.sendUserEvent(
      event_name,
      sub_id,
      test_event_code ?? null,
    );
  }
}
