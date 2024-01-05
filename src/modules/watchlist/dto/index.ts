import { IsString } from 'class-validator';

export class WatchlistDTO {
  @IsString()
  name: string;

  @IsString()
  assetId: string;
}
