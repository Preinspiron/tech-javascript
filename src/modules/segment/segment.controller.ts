import { Controller, Get, Query, Ip } from '@nestjs/common';
import { SegmentService } from './segment.service';

@Controller('segment')
export class SegmentController {
  constructor(private readonly segmentService: SegmentService) {}

  @Get('track')
  async track(
    @Query('subid') subid: string,
    @Query('ip') ip: string,
    @Query('status') status: string,
    @Query('value') value?: string,
    @Query('UA') UA?: string,
    @Query('origin') origin?: string,
    @Query('fbclid') fbclid?: string,
    @Query('ad_name') ad_name?: string,

  ): Promise<any> {
    return await this.segmentService.sendTrackEvent({
      status,
      subid,
      value,
      origin,
      UA,
      ip,
      fbclid,
      ad_name
    });
  }
}
