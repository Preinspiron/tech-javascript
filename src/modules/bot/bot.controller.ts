import { Body, Controller, Post } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { randomBytes } from 'crypto';
import { BotSubscription } from './models/bot.model';

class CreateKeyDto {
  offerIds: string[];
  label?: string;
}

@Controller('bot')
export class BotController {
  constructor(
    @InjectModel(BotSubscription)
    private readonly botSubscriptionModel: typeof BotSubscription,
  ) {}

  @Post('key')
  async createKey(@Body() dto: CreateKeyDto): Promise<{ key: string }> {
    const key = randomBytes(16).toString('hex');

    await this.botSubscriptionModel.create({
      key,
      chatId: null,
      offerIds: dto.offerIds.join(','),
      label: dto.label ?? null,
      sendHour: 10,
    });

    return { key };
  }
}

