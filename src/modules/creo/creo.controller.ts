import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { CreoService } from './creo.service';

@Controller('creo')
export class CreoController {
  constructor(private readonly creoService: CreoService) {}

  @Get()
  async getCreoUrl(
    @Query('name') name: string,
    @Res() res: Response,
  ): Promise<void> {
    const url = await this.creoService.getUrlByName(name);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(url);
  }
}

