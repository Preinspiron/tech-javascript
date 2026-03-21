import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Cost } from './models/cost.model';
import { CostItemDto, UpdateCostDto } from './dto/cost.dto';

@Injectable()
export class CostService {
  constructor(
    @InjectModel(Cost)
    private readonly costModel: typeof Cost,
  ) {}

  async getByKeitaroId(keitaroId: number): Promise<Cost[]> {
    return this.costModel.findAll({
      where: { keitaroId },
      order: [['costDate', 'DESC'], ['id', 'DESC']],
    });
  }

  async createUnique(
    keitaroId: number,
    items: CostItemDto[],
  ): Promise<{ inserted: number; skipped: number; records: Cost[] }> {
    const insertedRecords: Cost[] = [];
    let skipped = 0;

    for (const item of items) {
      const [record, created] = await this.costModel.findOrCreate({
        where: {
          keitaroId,
          costDate: item.costDate,
          campaign: item.campaign ?? null,
          adset: item.adset ?? null,
          ad: item.ad ?? null,
          fbId: item.fbId ?? null,
        },
        defaults: {
          keitaroId,
          costDate: item.costDate,
          campaign: item.campaign ?? null,
          adset: item.adset ?? null,
          ad: item.ad ?? null,
          fbId: item.fbId ?? null,
          costMod: item.costMod ?? null,
          costModCurrency: item.costModCurrency ?? null,
          costOriginal: item.costOriginal ?? null,
          costOriginalCurrency: item.costOriginalCurrency ?? null,
          log: item.log ?? null,
          status: item.status ?? 'new',
        },
      });

      if (created) {
        insertedRecords.push(record);
      } else {
        skipped += 1;
      }
    }

    return {
      inserted: insertedRecords.length,
      skipped,
      records: insertedRecords,
    };
  }

  async updateByKeitaroId(
    keitaroId: number,
    dto: UpdateCostDto,
  ): Promise<{ updated: number }> {
    const [updated] = await this.costModel.update(dto, {
      where: { keitaroId },
    });
    return { updated };
  }

  async deleteByKeitaroId(keitaroId: number): Promise<{ deleted: number }> {
    const deleted = await this.costModel.destroy({
      where: { keitaroId },
    });

    return { deleted };
  }
}
