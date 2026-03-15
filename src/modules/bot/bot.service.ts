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
  | { state: 'awaiting_stop_key' }
  | { state: 'awaiting_offer_config' }
  | { state: 'awaiting_company_config' }
  | { state: 'awaiting_update_key' }
  | { state: 'awaiting_update_config'; key: string };

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
        'REGS:\nhttps://buddytraff.com/postpack?subid={REPLACE}status=reg&from=REPLACE\n\n' +
        'DEPS:\nhttps://buddytraff.com/postpack?subid={REPLACE}status=sale&payout={REPLACE}&from=REPLACE';

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

    this.bot.onText(
      /^\/setup(?:@\w+)?(?:\s+(.+))?$/,
      async (msg, match?: RegExpExecArray | null) => {
        const chatId = msg.chat.id;
        const providedPassword = match && match[1] ? match[1].trim() : '';
        const expectedPassword =
          this.configService.get<string>('BOT_SETUP_PASSWORD') || 'Samtron123';

        if (!providedPassword || providedPassword !== expectedPassword) {
          await this.bot!.sendMessage(chatId, 'Access denied.');
          return;
        }

        const keyboard = {
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Offer', callback_data: 'setup_offer' },
                { text: 'Company', callback_data: 'setup_company' },
              ],
            ],
          },
        } as TelegramBot.SendMessageOptions;

        await this.bot!.sendMessage(chatId, 'Choose key type:', keyboard);
      },
    );

    this.bot.onText(/^\/stop(?:@\w+)?$/, async (msg) => {
      const chatId = msg.chat.id;
      this.chatStates.set(chatId, { state: 'awaiting_stop_key' });
      await this.bot!.sendMessage(
        chatId,
        'Send the key for which you want to stop stats in this chat.\n' +
          'If you want to remove all keys from this chat — send ALL.',
      );
    });

    this.bot.onText(/^\/update(?:@\w+)?$/, async (msg) => {
      const chatId = msg.chat.id;
      this.chatStates.set(chatId, { state: 'awaiting_update_key' });
      await this.bot!.sendMessage(
        chatId,
        'Send the key for which you want to update the ID list.',
      );
    });

    this.bot.on('callback_query', async (query) => {
      const chatId = query.message?.chat.id;
      const data = query.data;

      if (!chatId || !data) {
        return;
      }

      if (data === 'setup_offer') {
        this.chatStates.set(chatId, { state: 'awaiting_offer_config' });
        await this.bot!.sendMessage(
          chatId,
          'Send offer config in format: offerId1,offerId2 [percent] Label\n' +
            'Examples:\n' +
            '  149,150 30 BETFM (increase costs by 30%)\n' +
            '  149,150 BETFM (no cost change)',
        );
      } else if (data === 'setup_company') {
        this.chatStates.set(chatId, { state: 'awaiting_company_config' });
        await this.bot!.sendMessage(
          chatId,
          'Send company config in format: companyId1,companyId2 [percent] Label\n' +
            'Examples:\n' +
            '  10,11 30 BrandX (increase costs by 30%)\n' +
            '  10,11 BrandX (no cost change)',
        );
      }

      if (query.id) {
        await this.bot!.answerCallbackQuery(query.id);
      }
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
      } else if (state.state === 'awaiting_offer_config') {
        await this.handleSetupForChat(chatId, text, 'offer');
        this.chatStates.set(chatId, { state: 'idle' });
      } else if (state.state === 'awaiting_company_config') {
        await this.handleSetupForChat(chatId, text, 'company');
        this.chatStates.set(chatId, { state: 'idle' });
      } else if (state.state === 'awaiting_stop_key') {
        await this.handleStopForChat(chatId, text);
        this.chatStates.set(chatId, { state: 'idle' });
      } else if (state.state === 'awaiting_update_key') {
        await this.handleUpdateKeyForChat(chatId, text);
      } else if (state.state === 'awaiting_update_config') {
        await this.handleUpdateConfigForChat(chatId, text, state.key);
      }
    });
  }

  private async handleUpdateKeyForChat(chatId: number, key: string): Promise<void> {
    if (!this.bot) return;
    const trimmed = key.trim();
    const subscription = await this.botSubscriptionModel.findOne({
      where: { key: trimmed },
    });
    if (!subscription) {
      await this.bot.sendMessage(chatId, 'Key not found.');
      this.chatStates.set(chatId, { state: 'idle' });
      return;
    }
    const subType = (subscription as any).type || 'offer';
    this.chatStates.set(chatId, { state: 'awaiting_update_config', key: trimmed });
    if (subType === 'offer') {
      await this.bot.sendMessage(
        chatId,
        'Send new offer IDs in format: offerId1,offerId2 Label\nExample: 149,150,160 BETFM',
      );
    } else {
      await this.bot.sendMessage(
        chatId,
        'Send new company IDs in format: companyId1,companyId2 Label\nExample: 10,11,12 BrandX',
      );
    }
  }

  private async handleUpdateConfigForChat(
    chatId: number,
    text: string,
    key: string,
  ): Promise<void> {
    if (!this.bot) return;
    this.chatStates.set(chatId, { state: 'idle' });

    const subscription = await this.botSubscriptionModel.findOne({
      where: { key },
    });
    if (!subscription) {
      await this.bot.sendMessage(chatId, 'Key not found.');
      return;
    }

    const parts = text.trim().split(/\s+/);
    const idsPart = parts[0];
    let costPercent: number | null = null;
    let labelPart = '';

    if (parts.length >= 2) {
      const maybePercentRaw = parts[1].replace('%', '');
      const maybePercent = Number(maybePercentRaw);
      if (!Number.isNaN(maybePercent)) {
        costPercent = maybePercent;
        labelPart = parts.slice(2).join(' ');
      } else {
        labelPart = parts.slice(1).join(' ');
      }
    }

    if (!idsPart) {
      const usage =
        (subscription as any).type === 'company'
          ? 'companyId1,companyId2 [percent] Label'
          : 'offerId1,offerId2 [percent] Label';
      await this.bot.sendMessage(chatId, `Invalid format. Use: ${usage}`);
      return;
    }

    const ids = idsPart
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      await this.bot.sendMessage(chatId, 'Specify at least one ID.');
      return;
    }

    subscription.offerIds = ids.join(',');
    subscription.label = labelPart || null;
    subscription.costPercent = costPercent;
    await subscription.save();

    await this.bot.sendMessage(
      chatId,
      'Key updated.\n\n' +
        'Key:\n```\n' + key + '\n```\n' +
        ((subscription as any).type === 'offer'
          ? `Offers: ${ids.join(', ')}\n`
          : `Companies: ${ids.join(', ')}\n`) +
        (subscription.label ? `Label: ${subscription.label}\n` : '') +
        (subscription.costPercent != null
          ? `Cost markup: ${subscription.costPercent}%\n`
          : ''),
      { parse_mode: 'Markdown' },
    );
  }

  private async handleSetupForChat(
    chatId: number,
    text: string,
    type: 'offer' | 'company',
  ): Promise<void> {
    if (!this.bot) {
      return;
    }

    const parts = text.trim().split(/\s+/);
    const idsPart = parts[0];
    let costPercent: number | null = null;
    let labelPart = '';

    if (parts.length >= 2) {
      const maybePercentRaw = parts[1].replace('%', '');
      const maybePercent = Number(maybePercentRaw);
      if (!Number.isNaN(maybePercent)) {
        costPercent = maybePercent;
        labelPart = parts.slice(2).join(' ');
      } else {
        labelPart = parts.slice(1).join(' ');
      }
    }

    if (!idsPart) {
      const usagePrefix =
        type === 'offer'
          ? 'offerId1,offerId2 [percent] Label'
          : 'companyId1,companyId2 [percent] Label';
      await this.bot.sendMessage(
        chatId,
        `Cannot parse format. Use: ${usagePrefix}`,
      );
      return;
    }

    const ids = idsPart
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      const what =
        type === 'offer' ? 'at least one offer_id.' : 'at least one companyId.';
      await this.bot.sendMessage(chatId, `You must specify ${what}`);
      return;
    }

    const key = randomBytes(16).toString('hex');

    await this.botSubscriptionModel.create({
      key,
      chatId: String(chatId),
      offerIds: ids.join(','),
      label: labelPart || null,
      costPercent,
      sendHour: this.dailySendHour,
      type,
    });

    await this.bot.sendMessage(
      chatId,
      'Key created.\n\n' +
        'Key:\n```\n' + key + '\n```\n' +
        (type === 'offer'
          ? `Offers: ${ids.join(', ')}\n`
          : `Companies: ${ids.join(', ')}\n`) +
        (labelPart ? `Label: ${labelPart}\n` : '') +
        (costPercent != null ? `Cost markup: ${costPercent}%\n` : '') +
        `Daily stats will be sent around ${this.dailySendHour}:00 (server time).\n\n` +
        'To get stats immediately — send /stat and then this key.',
      { parse_mode: 'Markdown' },
    );

    this.lastKeys.set(chatId, key);
  }

  private async handleKeyForChat(chatId: number, key: string): Promise<void> {
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

    const lines: string[] = [];
    const type = (subscription as any).type || 'offer';
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

    if (type === 'company') {
      const companyIds = subscription.offerIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

      const companiesRaw = await this.getCompanyStats(companyIds);
      const companies =
        costPercent == null || Number.isNaN(costPercent)
          ? companiesRaw
          : companiesRaw.map((c) => ({
              companyId: c.companyId,
              all: applyCostPercent(c.all),
              yesterday: applyCostPercent(c.yesterday),
              today: applyCostPercent(c.today),
            }));

      for (const company of companies) {
        const formatBlock = (
          prefix: string,
          s: Awaited<ReturnType<typeof this.fetchCompanyStats>>,
          companyId: string,
        ) => {
          const spendInt = Math.round(s.spent);
          const r2d = Math.round(s.regToDepSalePercent);
          const uniq2conv = Math.round(s.uniqueToConvPercent);
          const costPerConv = s.costPerConversion.toFixed(2);
          const costPerDep = s.costPerDepSale.toFixed(2);
          const namePart = s.companyName ? ` ${s.companyName}` : '';

          return [
            `${prefix} -> ${companyId}${namePart}`,
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

        lines.push(formatBlock('All time', company.all, company.companyId));
        lines.push('');
        lines.push(
          formatBlock('Yesterday', company.yesterday, company.companyId),
        );
        lines.push('');
        lines.push(formatBlock('Today', company.today, company.companyId));
        lines.push('\n');
      }
    } else {
      const offerIds = subscription.offerIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

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
          const adjusted = applyCostPercent(s);
          const spendInt = Math.round(adjusted.spent);
          const r2d = Math.round(s.regToDepSalePercent);
          const uniq2conv = Math.round(s.uniqueToConvPercent);
          const costPerConv = adjusted.costPerConversion.toFixed(2);
          const costPerDep = adjusted.costPerDepSale.toFixed(2);
          const namePart = adjusted.offerName ? ` ${adjusted.offerName}` : '';

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
    }

    lines.push(
      (subscription.label ? `label: ${subscription.label}\n` : '') +
        'key:\n```\n' + subscription.key + '\n```\n' +
        (type === 'company'
          ? `companies: ${subscription.offerIds}`
          : `offers: ${subscription.offerIds}`),
    );

    const message = lines.join('\n');

    await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

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
      const dimensions = [
        'day',
        'campaign',
        'campaign_id',
        'offer',
        'offer_id',
      ];
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
        conversions += Number(row.conversions ?? 0);
        deposits += Number(row.deposits ?? 0);
        sales += Number(row.sales ?? 0);
        if (!offerName && row.offer) {
          offerName = String(row.offer);
        }
      }

      // В Keitaro регистрации хранятся в conversions, не в regs
      regs = conversions;
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
          ? Math.round(((conversions / uniques) * 100 + Number.EPSILON) * 100) /
            100
          : 0;

      const costPerConversion =
        conversions > 0
          ? Math.round((cost / conversions + Number.EPSILON) * 100) / 100
          : 0;

      const costPerDepSale =
        depositsSalesCount > 0
          ? Math.round((cost / depositsSalesCount + Number.EPSILON) * 100) / 100
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

  private async fetchCompanyStats(
    companyIds: string,
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
    companyName: string | null;
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
        companyName: null,
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

      const dimensions = [
        'day',
        'campaign',
        'campaign_id',
        'offer',
        'offer_id',
      ];
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

      const companyIdList = companyIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

      const filters: any = {
        AND: [],
      };

      if (companyIdList.length > 0) {
        filters.AND.push({
          name: 'campaign_id',
          operator: 'IN_LIST',
          expression: companyIdList,
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
        `Keitaro company request url=${url} payload=${JSON.stringify(payload)}`,
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
      let companyName: string | null = null;

      for (const row of rows) {
        clicks += Number(row.clicks ?? 0);
        uniques += Number(row.visitors ?? 0);
        cost += Number(row.cost ?? 0);
        conversions += Number(row.conversions ?? 0);
        deposits += Number(row.deposits ?? 0);
        sales += Number(row.sales ?? 0);
        if (!companyName && row.campaign) {
          companyName = String(row.campaign);
        }
      }

      // В Keitaro регистрации хранятся в conversions, не в regs
      regs = conversions;
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
          ? Math.round(((conversions / uniques) * 100 + Number.EPSILON) * 100) /
            100
          : 0;

      const costPerConversion =
        conversions > 0
          ? Math.round((cost / conversions + Number.EPSILON) * 100) / 100
          : 0;

      const costPerDepSale =
        depositsSalesCount > 0
          ? Math.round((cost / depositsSalesCount + Number.EPSILON) * 100) / 100
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
        companyName,
      };
    } catch (error: any) {
      if (error.response) {
        this.logger.error(
          `Failed to fetch Keitaro company stats: ${error.response.status}`,
        );
        this.logger.error(
          `Keitaro company response body: ${JSON.stringify(
            error.response.data,
            null,
            2,
          )}`,
        );
      } else {
        this.logger.error(
          'Failed to fetch Keitaro company stats',
          error as Error,
        );
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
        companyName: null,
      };
    }
  }

  async getCompanyStats(companyIds: string[]): Promise<
    {
      companyId: string;
      all: {
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
        companyName: string | null;
      };
      yesterday: {
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
        companyName: string | null;
      };
      today: {
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
        companyName: string | null;
      };
    }[]
  > {
    const uniqueIds = Array.from(
      new Set(companyIds.map((id) => id.trim()).filter(Boolean)),
    );

    const results: {
      companyId: string;
      all: {
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
        companyName: string | null;
      };
      yesterday: {
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
        companyName: string | null;
      };
      today: {
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
        companyName: string | null;
      };
    }[] = [];

    for (const id of uniqueIds) {
      const [all, yesterday, today] = await Promise.all([
        this.fetchCompanyStats(id, 'all'),
        this.fetchCompanyStats(id, 'yesterday'),
        this.fetchCompanyStats(id, 'today'),
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

  private async handleStopForChat(chatId: number, text: string): Promise<void> {
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
