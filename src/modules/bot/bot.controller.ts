import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
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

  @Get('offer-key-stat')
  async getOfferKeyStat(
    @Query('key') key: string,
  ): Promise<{
    key: string;
    label: string | null;
    type: 'offer';
    offers: {
      offerId: string;
      offerName: string | null;
      all: any;
      yesterday: any;
      today: any;
    }[];
  }> {
    const subscription = await this.botSubscriptionModel.findOne({
      where: { key },
    });

    if (!subscription || (subscription as any).type === 'company') {
      throw new NotFoundException('Offer key not found');
    }

    const costPercent =
      (subscription as any).costPercent != null
        ? Number((subscription as any).costPercent)
        : null;

    const applyCostPercent = <T extends { spent: number; costPerConversion: number; costPerDepSale: number }>(
      s: T,
    ): T => {
      if (costPercent == null || Number.isNaN(costPercent)) return s;
      const factor = 1 + costPercent / 100;
      return {
        ...s,
        spent: s.spent * factor,
        costPerConversion: s.costPerConversion * factor,
        costPerDepSale: s.costPerDepSale * factor,
      };
    };

    const offerIds = subscription.offerIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    const offers = [];
    for (const offerId of offerIds) {
      const [all, yesterday, today] = await Promise.all([
        this.botService['fetchOfferStats'](offerId, 'all'),
        this.botService['fetchOfferStats'](offerId, 'yesterday'),
        this.botService['fetchOfferStats'](offerId, 'today'),
      ]);
      offers.push({
        offerId,
        offerName: all.offerName,
        all: applyCostPercent(all),
        yesterday: applyCostPercent(yesterday),
        today: applyCostPercent(today),
      });
    }

    return {
      key: subscription.key,
      label: subscription.label,
      type: 'offer',
      offers,
    };
  }

  @Get('company-key-stat')
  async getCompanyKeyStat(
    @Query('key') key: string,
  ): Promise<{
    key: string;
    label: string | null;
    type: 'company';
    companies: {
      companyId: string;
      all: any;
      yesterday: any;
      today: any;
    }[];
  }> {
    const subscription = await this.botSubscriptionModel.findOne({
      where: { key },
    });

    if (!subscription || (subscription as any).type === 'offer') {
      throw new NotFoundException('Company key not found');
    }

    const costPercent =
      (subscription as any).costPercent != null
        ? Number((subscription as any).costPercent)
        : null;

    const applyCostPercent = <T extends { spent: number; costPerConversion: number; costPerDepSale: number }>(
      s: T,
    ): T => {
      if (costPercent == null || Number.isNaN(costPercent)) return s;
      const factor = 1 + costPercent / 100;
      return {
        ...s,
        spent: s.spent * factor,
        costPerConversion: s.costPerConversion * factor,
        costPerDepSale: s.costPerDepSale * factor,
      };
    };

    const companyIds = subscription.offerIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    const rawCompanies = await this.botService.getCompanyStats(companyIds);
    const companies =
      costPercent == null || Number.isNaN(costPercent)
        ? rawCompanies
        : rawCompanies.map((c) => ({
            companyId: c.companyId,
            all: applyCostPercent(c.all),
            yesterday: applyCostPercent(c.yesterday),
            today: applyCostPercent(c.today),
          }));

    return {
      key: subscription.key,
      label: subscription.label,
      type: 'company',
      companies,
    };
  }
}

