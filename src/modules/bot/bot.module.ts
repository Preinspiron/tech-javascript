import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule } from '@nestjs/config';
import { BotSubscription } from './models/bot.model';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';

@Module({
  imports: [ConfigModule, SequelizeModule.forFeature([BotSubscription])],
  providers: [BotService],
  controllers: [BotController],
})
export class BotModule {}

