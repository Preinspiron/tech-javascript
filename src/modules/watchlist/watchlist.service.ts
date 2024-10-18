import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Watchlist } from './models/watchlist.model';
import { WatchlistDTO } from './dto';
import { CreateAssetResponse } from './response';

@Injectable()
export class WatchlistService {
  constructor(
    @InjectModel(Watchlist)
    private readonly watchlistRepositories: typeof Watchlist,
  ) {}

  async createAsset(
    assetDto: WatchlistDTO,
    id: any,
  ): Promise<CreateAssetResponse> {
    try {
      const watchlist = {
        user: id,
        name: assetDto.name,
        assetId: assetDto.assetId,
      };
      await this.watchlistRepositories.create(watchlist);
      return watchlist;
    } catch (err) {
      throw new Error(err);
    }
  }

  async deleteAsset(userId: number, assetId: string): Promise<boolean> {
    try {
      await this.watchlistRepositories.destroy({
        where: { id: assetId, user: userId },
      });
      return true;
    } catch (err) {
      throw new Error(err);
    }
  }
}
