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
    @Headers() headers: Record<string, string>, // Читаем все заголовки
    @Body() body: any, // Читаем тело запроса
  ): string {
    console.log('Headers:', headers); // Выводим заголовки в консоль
    console.log('Body:', body); // Выводим тело запроса в консоль
    return 'Post request received'; // Возвращаем ответ
  }
}
