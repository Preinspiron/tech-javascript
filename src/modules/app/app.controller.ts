import { Controller, Get, Post, Body, Headers, Query, Render } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('predict')
  @Render('index.html')
  renderPredict(@Query() query: Record<string, any>) {
    return { queryJson: JSON.stringify(query ?? {}) };
  }
}
