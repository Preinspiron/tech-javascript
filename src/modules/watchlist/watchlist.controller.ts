import {
  Body,
  Controller,
  Delete,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { WatchlistService } from './watchlist.service';
import { WatchlistDTO } from './dto';
import { JwtAuthGuard } from '../../guards/jwt-guard';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('watchlist')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @ApiTags('API')
  @ApiResponse({
    status: 201,
    type: WatchlistDTO,
  })
  @UseGuards(JwtAuthGuard)
  @Post('create')
  createAsset(@Body() assetDto: WatchlistDTO, @Req() request: any) {
    console.log(request);
    return this.watchlistService.createAsset(assetDto, request.user);
  }

  @ApiTags('API')
  @ApiResponse({
    status: 200,
  })
  @UseGuards(JwtAuthGuard)
  @Delete()
  deleteAsset(@Query('id') assetId: string, @Req() request: any) {
    const { id } = request.user;
    return this.watchlistService.deleteAsset(id, assetId);
  }
}
