import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { randomBytes } from 'crypto';
import { BotSubscription } from './models/bot.model';
import { BotService } from './bot.service';

class CreateKeyDto {
  offerIds: string[];
  label?: string;
}

@Controller('bot')
export class BotController {
  constructor(
    @InjectModel(BotSubscription)
    private readonly botSubscriptionModel: typeof BotSubscription,
    private readonly botService: BotService,
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

  @Get('company-stat')
  async getCompanyStat(
    @Query('companyIds') companyIdsRaw: string,
  ): Promise<{
    companies: {
      companyId: string;
      all: any;
      yesterday: any;
      today: any;
    }[];
  }> {
    const companyIds = (companyIdsRaw || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    const companies = await this.botService.getCompanyStats(companyIds);

    return { companies };
  }
}

