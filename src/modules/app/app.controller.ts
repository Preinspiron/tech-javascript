import { Controller, Get, Post, Body, Headers } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
  @Post()
  handlePost(
    @Headers() headers: Record<string, string>,
    @Body() body: any,
  ): string {
    console.log('Headers:', headers);
    console.log('Body:', body);
    return 'Post request received';
  }
}
