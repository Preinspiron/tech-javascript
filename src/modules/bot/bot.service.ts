import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import TelegramBot = require('node-telegram-bot-api');
import axios from 'axios';
import { BotSubscription } from './models/bot.model';
import { randomBytes } from 'crypto';

type StatPeriod = 'today' | 'yesterday' | 'all';

type ChatState =
  | { state: 'idle' }
  | { state: 'awaiting_key' }
  | { state: 'awaiting_setup' }
  | { state: 'awaiting_stop_key' };

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name);
  private bot: TelegramBot | null = null;
  private chatStates = new Map<number, ChatState>();
  private lastKeys = new Map<number, string>();

  private readonly keitaroBaseUrl: string;
  private readonly keitaroApiKey: string | undefined;
  private readonly dailySendHour = 10; // 10:00 по времени сервера

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(BotSubscription)
    private readonly botSubscriptionModel: typeof BotSubscription,
  ) {
    this.keitaroBaseUrl =
      this.configService.get<string>('KEITARO_BASE_URL') ||
      this.configService.get<string>('KEITARO_REPORT_URL') ||
      '';
    this.keitaroApiKey = this.configService.get<string>('KEITARO_API_KEY');
  }

  async onModuleInit(): Promise<void> {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');

    if (!token) {
      this.logger.warn(
        'TELEGRAM_BOT_TOKEN is not set. Telegram bot will not be started.',
      );
      return;
    }

    this.bot = new TelegramBot(token, { polling: true });
    this.logger.log('Telegram bot started with polling mode');

    this.registerHandlers();
    this.startDailyStatsJob();
  }

  private registerHandlers(): void {
    if (!this.bot) {
      return;
    }

    this.bot.onText(/^\/postback(?:@\w+)?$/, async (msg) => {
      const chatId = msg.chat.id;
      const text =
        'REGS:\nhttps://buddytraff.com/postpack?status=reg\n\n' +
        'DEPS:\nhttps://buddytraff.com/postpack?status=sale';

      await this.bot!.sendMessage(chatId, text);
    });

    const askKey = async (chatId: number) => {
      const lastKey = this.lastKeys.get(chatId);
      if (lastKey) {
        await this.handleKeyForChat(chatId, lastKey);
        return;
      }

      // fallback: if there is exactly one subscription bound to this chat, use it
      const existingForChat = await this.botSubscriptionModel.findAll({
        where: { chatId: String(chatId) },
      });
      if (existingForChat.length === 1) {
        await this.handleKeyForChat(chatId, existingForChat[0].key);
        return;
      }

      this.chatStates.set(chatId, { state: 'awaiting_key' });
      await this.bot!.sendMessage(
        chatId,
        'Send key for offer (it can be generated via /setup beforehand).',
      );
    };

    // Default /stat: show all periods, reuse last key if possible
    this.bot.onText(/^\/stat(?:@\w+)?$/, async (msg) => {
      const chatId = msg.chat.id;
      await askKey(chatId);
    });

    this.bot.onText(/^\/stat_today(?:@\w+)?$/, async (msg) => {
      const chatId = msg.chat.id;
      await askKey(chatId);
    });

    this.bot.onText(/^\/stat_yesterday(?:@\w+)?$/, async (msg) => {
      const chatId = msg.chat.id;
      await askKey(chatId);
    });

    this.bot.onText(/^\/stat_all(?:@\w+)?$/, async (msg) => {
      const chatId = msg.chat.id;
      await askKey(chatId);
    });

    this.bot.onText(/^\/setup(?:@\w+)?$/, async (msg) => {
      const chatId = msg.chat.id;
      this.chatStates.set(chatId, { state: 'awaiting_setup' });
      await this.bot!.sendMessage(
        chatId,
        'Send settings in format:\n\n' +
          'offerId1,offerId2 Label\n\n' +
          'Examples:\n' +
          '123 Casino A RU\n' +
          '123,456 Casino Pack\n\n' +
          'Daily stats will be sent at 10:00 (server time).',
      );
    });

    this.bot.onText(/^\/stop(?:@\w+)?$/, async (msg) => {
      const chatId = msg.chat.id;
      this.chatStates.set(chatId, { state: 'awaiting_stop_key' });
      await this.bot!.sendMessage(
        chatId,
        'Send the key for which you want to stop stats in this chat.\n' +
          'If you want to remove all keys from this chat — send ALL.',
      );
    });

    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text?.trim();

      if (!text) {
        return;
      }

      // Команды обрабатываются отдельными onText
      if (text.startsWith('/')) {
        return;
      }

      const state = this.chatStates.get(chatId) || { state: 'idle' };
      if (state.state === 'awaiting_key') {
        await this.handleKeyForChat(chatId, text);
        this.chatStates.set(chatId, { state: 'idle' });
      } else if (state.state === 'awaiting_setup') {
        await this.handleSetupForChat(chatId, text);
        this.chatStates.set(chatId, { state: 'idle' });
      } else if (state.state === 'awaiting_stop_key') {
        await this.handleStopForChat(chatId, text);
        this.chatStates.set(chatId, { state: 'idle' });
      }
    });
  }

  private async handleSetupForChat(
    chatId: number,
    text: string,
  ): Promise<void> {
    if (!this.bot) {
      return;
    }

    const parts = text.trim().split(/\s+/);
    const offersPart = parts[0];
    const labelPart = parts.slice(1).join(' ');

    if (!offersPart) {
      await this.bot.sendMessage(
        chatId,
        'Cannot parse format. Use: offerId1,offerId2 Label',
      );
      return;
    }

    const offerIds = offersPart
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (offerIds.length === 0) {
      await this.bot.sendMessage(
        chatId,
        'You must specify at least one offer_id.',
      );
      return;
    }

    const key = randomBytes(16).toString('hex');

    await this.botSubscriptionModel.create({
      key,
      chatId: String(chatId),
      offerIds: offerIds.join(','),
      label: labelPart || null,
      sendHour: this.dailySendHour,
    });

    await this.bot.sendMessage(
      chatId,
      'Key created.\n\n' +
        `Key: ${key}\n` +
        `Offers: ${offerIds.join(', ')}\n` +
        (labelPart ? `Label: ${labelPart}\n` : '') +
        `Daily stats will be sent around ${this.dailySendHour}:00 (server time).\n\n` +
        'To get stats immediately — send /stat and then this key.',
    );

    this.lastKeys.set(chatId, key);
  }

  private async handleKeyForChat(
    chatId: number,
    key: string,
  ): Promise<void> {
    if (!this.bot) {
      return;
    }

    const subscription = await this.botSubscriptionModel.findOne({
      where: { key },
    });

    if (!subscription) {
      await this.bot.sendMessage(
        chatId,
        'Ключ не найден. Проверь, что он создан для нужного оффера.',
      );
      return;
    }

    if (!subscription.chatId) {
      subscription.chatId = String(chatId);
      await subscription.save();
    } else if (subscription.chatId !== String(chatId)) {
      subscription.chatId = String(chatId);
      await subscription.save();
    }

    const offerIds = subscription.offerIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    const lines: string[] = [];

    for (const offerId of offerIds) {
      const [all, yesterday, today] = await Promise.all([
        this.fetchOfferStats(offerId, 'all'),
        this.fetchOfferStats(offerId, 'yesterday'),
        this.fetchOfferStats(offerId, 'today'),
      ]);

      const formatBlock = (
        prefix: string,
        s: Awaited<ReturnType<typeof this.fetchOfferStats>>,
      ) => {
        const spendInt = Math.round(s.spent);
        const r2d = Math.round(s.regToDepSalePercent);
        const uniq2conv = Math.round(s.uniqueToConvPercent);
        const costPerConv = s.costPerConversion.toFixed(2);
        const costPerDep = s.costPerDepSale.toFixed(2);
        const namePart = s.offerName ? ` ${s.offerName}` : '';

        return [
          `${prefix} -> ${offerId}${namePart}`,
          `  Clicks: ${s.clicks}`,
          `  Uniques: ${s.uniques}`,
          `  spend: $${spendInt}`,
          `  regs: ${s.regs}`,
          `  deps: ${s.depositsSalesCount}`,
          `  r2d: ${r2d}%`,
          `  uniq2conv: ${uniq2conv}%`,
          `  cost per conversion: ${costPerConv}$`,
          `  cost per deposit: ${costPerDep}$`,
        ].join('\n');
      };

      lines.push(formatBlock('All time', all));
      lines.push('');
      lines.push(formatBlock('Yesterday', yesterday));
      lines.push('');
      lines.push(formatBlock('Today', today));
      lines.push('\n');
    }

    lines.push(
      (subscription.label ? `label: ${subscription.label}\n` : '') +
        `key: ${subscription.key}\n` +
        `offers: ${subscription.offerIds}`,
    );

    const message = lines.join('\n');

    await this.bot.sendMessage(chatId, message);

    this.lastKeys.set(chatId, subscription.key);
  }

  private async fetchOfferStats(
    offerIds: string,
    period: StatPeriod,
  ): Promise<{
    clicks: number;
    uniques: number;
    spent: number;
    regs: number;
    conversions: number;
    depositsSalesCount: number;
    regToDepSalePercent: number;
    uniqueToConvPercent: number;
    costPerConversion: number;
    costPerDepSale: number;
    offerName: string | null;
  }> {
    if (!this.keitaroBaseUrl || !this.keitaroApiKey) {
      this.logger.warn(
        'KEITARO_BASE_URL/KEITARO_REPORT_URL or KEITARO_API_KEY is not configured. Returning zero stats.',
      );
      return {
        clicks: 0,
        uniques: 0,
        spent: 0,
        regs: 0,
        conversions: 0,
        depositsSalesCount: 0,
        regToDepSalePercent: 0,
        uniqueToConvPercent: 0,
        costPerConversion: 0,
        costPerDepSale: 0,
        offerName: null,
      };
    }

    try {
      const tz = 'Europe/Vienna';
      const now = new Date();

      let fromDateStr: string;
      let toDateStr: string;

      if (period === 'today') {
        const today = now;
        const d = new Date(
          Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
        );
        fromDateStr = d.toISOString().slice(0, 10);
        toDateStr = fromDateStr;
      } else if (period === 'yesterday') {
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const d = new Date(
          Date.UTC(
            yesterday.getFullYear(),
            yesterday.getMonth(),
            yesterday.getDate(),
          ),
        );
        fromDateStr = d.toISOString().slice(0, 10);
        toDateStr = fromDateStr;
      } else {
        // all time — с условной старой даты до сегодня
        fromDateStr = '2015-01-01';
        const d = new Date(
          Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
        );
        toDateStr = d.toISOString().slice(0, 10);
      }

      const range = {
        from: `${fromDateStr} 00:00`,
        to: `${toDateStr} 23:59`,
        timezone: tz,
      };

      // Максимально близко к твоему Google Apps Script
      const dimensions = ['day', 'campaign', 'campaign_id', 'offer', 'offer_id'];
      const measures = [
        'clicks',
        'visitors',
        'revenue',
        'cost',
        'sales',
        'conversions',
        'deposits',
        'regs',
      ];

      const offerIdList = offerIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

      const filters: any = {
        AND: [],
      };

      if (offerIdList.length > 0) {
        filters.AND.push({
          name: 'offer_id',
          operator: 'IN_LIST',
          expression: offerIdList,
        });
      }

      const payload = {
        range,
        dimensions,
        measures,
        filters,
        sort: [],
        limit: 1000,
        offset: 0,
        summary: true,
        extended: false,
      };

      const url = `${this.keitaroBaseUrl.replace(/\/$/, '')}/report/build`;

      this.logger.debug?.(
        `Keitaro request url=${url} payload=${JSON.stringify(payload)}`,
      );

      const response = await axios.post(url, payload, {
        headers: {
          'Api-Key': this.keitaroApiKey,
          'Content-Type': 'application/json',
        },
      });

      const data = response.data || {};
      const rows: any[] = Array.isArray(data.rows) ? data.rows : [];

      let clicks = 0;
      let uniques = 0;
      let cost = 0;
      let regs = 0;
      let conversions = 0;
      let deposits = 0;
      let sales = 0;
      let offerName: string | null = null;

      for (const row of rows) {
        clicks += Number(row.clicks ?? 0);
        uniques += Number(row.visitors ?? 0);
        cost += Number(row.cost ?? 0);
        regs += Number(row.regs ?? 0);
        conversions += Number(row.conversions ?? 0);
        deposits += Number(row.deposits ?? 0);
        sales += Number(row.sales ?? 0);
        if (!offerName && row.offer) {
          offerName = String(row.offer);
        }
      }

      const depositsSalesCount = deposits + sales;
      const spent = Math.round((cost + Number.EPSILON) * 100) / 100;

      const regToDepSalePercent =
        regs > 0
          ? Math.round(
              ((depositsSalesCount / regs) * 100 + Number.EPSILON) * 100,
            ) / 100
          : 0;

      const uniqueToConvPercent =
        uniques > 0
          ? Math.round(
              ((conversions / uniques) * 100 + Number.EPSILON) * 100,
            ) / 100
          : 0;

      const costPerConversion =
        conversions > 0
          ? Math.round(((cost / conversions + Number.EPSILON) * 100)) / 100
          : 0;

      const costPerDepSale =
        depositsSalesCount > 0
          ? Math.round(((cost / depositsSalesCount + Number.EPSILON) * 100)) /
            100
          : 0;

      return {
        clicks,
        uniques,
        spent,
        regs,
        conversions,
        depositsSalesCount,
        regToDepSalePercent,
        uniqueToConvPercent,
        costPerConversion,
        costPerDepSale,
        offerName,
      };
    } catch (error: any) {
      if (error.response) {
        this.logger.error(
          `Failed to fetch Keitaro stats: ${error.response.status}`,
        );
        this.logger.error(
          `Keitaro response body: ${JSON.stringify(
            error.response.data,
            null,
            2,
          )}`,
        );
      } else {
        this.logger.error('Failed to fetch Keitaro stats', error as Error);
      }
      return {
        clicks: 0,
        uniques: 0,
        spent: 0,
        regs: 0,
        conversions: 0,
        depositsSalesCount: 0,
        regToDepSalePercent: 0,
        uniqueToConvPercent: 0,
        costPerConversion: 0,
        costPerDepSale: 0,
        offerName: null,
      };
    }
  }

  async getCompanyStats(companyIds: string[]): Promise<
    {
      companyId: string;
      all: Awaited<ReturnType<typeof this.fetchOfferStats>>;
      yesterday: Awaited<ReturnType<typeof this.fetchOfferStats>>;
      today: Awaited<ReturnType<typeof this.fetchOfferStats>>;
    }[]
  > {
    const uniqueIds = Array.from(
      new Set(
        companyIds
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    );

    const results: {
      companyId: string;
      all: Awaited<ReturnType<typeof this.fetchOfferStats>>;
      yesterday: Awaited<ReturnType<typeof this.fetchOfferStats>>;
      today: Awaited<ReturnType<typeof this.fetchOfferStats>>;
    }[] = [];

    for (const id of uniqueIds) {
      const [all, yesterday, today] = await Promise.all([
        this.fetchOfferStats(id, 'all'),
        this.fetchOfferStats(id, 'yesterday'),
        this.fetchOfferStats(id, 'today'),
      ]);
      results.push({
        companyId: id,
        all,
        yesterday,
        today,
      });
    }

    return results;
  }

  private async handleStopForChat(
    chatId: number,
    text: string,
  ): Promise<void> {
    if (!this.bot) {
      return;
    }

    const trimmed = text.trim();

    if (trimmed.toUpperCase() === 'ALL') {
      await this.botSubscriptionModel.update(
        { chatId: null },
        { where: { chatId: String(chatId) } },
      );

      this.lastKeys.delete(chatId);

      await this.bot.sendMessage(
        chatId,
        'All keys detached from this chat. Daily stats will no longer be sent here.',
      );
      return;
    }

    const subscription = await this.botSubscriptionModel.findOne({
      where: { key: trimmed, chatId: String(chatId) },
    });

    if (!subscription) {
      await this.bot.sendMessage(
        chatId,
        'Key for this chat not found. Make sure you send the exact key that is attached here.',
      );
      return;
    }

    subscription.chatId = null;
    await subscription.save();

    await this.bot.sendMessage(
      chatId,
      `Stats for key ${subscription.key} have been stopped for this chat.`,
    );

    const lastKey = this.lastKeys.get(chatId);
    if (lastKey && lastKey === subscription.key) {
      this.lastKeys.delete(chatId);
    }
  }

  private startDailyStatsJob(): void {
    if (!this.bot) {
      return;
    }

    const sendAll = async () => {
      const subs = await this.botSubscriptionModel.findAll({
        where: { chatId: { ['!=']: null } as any },
      });

      for (const sub of subs) {
        try {
          const chatId = Number(sub.chatId);
          if (!chatId || Number.isNaN(chatId)) {
            continue;
          }

          const stats = await this.fetchOfferStats(sub.offerIds, 'yesterday');

          const message =
            `Ежедневная статистика за вчера по ключу: ${sub.key}\n` +
            (sub.label ? `Название: ${sub.label}\n` : '') +
            `Офферы: ${sub.offerIds}\n\n` +
            `Клики: ${stats.clicks}\n` +
            `Уники: ${stats.uniques}\n` +
            `Спенд: ${stats.spent}\n` +
            `Регистрации: ${stats.regs}\n` +
            `Конверсии: ${stats.conversions}\n` +
            `Депозиты + продажи (шт): ${stats.depositsSalesCount}\n` +
            `% reg → (deposits + sales): ${stats.regToDepSalePercent}\n` +
            `% uniq → conversions: ${stats.uniqueToConvPercent}\n` +
            `Цена за конверсию (cost/conversions): ${stats.costPerConversion}\n` +
            `Цена за деп+sale (cost/(deposits+sales)): ${stats.costPerDepSale}`;

          await this.bot.sendMessage(chatId, message);
        } catch (e) {
          this.logger.error(
            `Failed to send daily stats for subscription ${sub.id}`,
            e as Error,
          );
        }
      }
    };
    const now = new Date();
    const nextRun = new Date(now.getTime());
    nextRun.setHours(this.dailySendHour, 0, 0, 0);

    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const delay = nextRun.getTime() - now.getTime();
    this.logger.log(
      `Daily stats job scheduled at ${nextRun.toISOString()} (server time).`,
    );

    setTimeout(() => {
      void sendAll();
      const intervalMs = 24 * 60 * 60 * 1000;
      setInterval(() => {
        void sendAll();
      }, intervalMs);
    }, delay);
  }
}

