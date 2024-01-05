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
    user: any,
  ): Promise<CreateAssetResponse> {
    const watchlist = {
      user: user.id,
      name: assetDto.name,
      assetId: assetDto.assetId,
    };
    await this.watchlistRepositories.create(watchlist);
    return watchlist;
  }

  async deleteAsset(userId: number, assetId: string) {
    await this.watchlistRepositories.destroy({
      where: { id: assetId, user: userId },
    });
    return true;
  }
}
