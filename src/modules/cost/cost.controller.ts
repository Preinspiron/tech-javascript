import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CostService } from './cost.service';
import { CreateCostDto, UpdateCostDto } from './dto/cost.dto';

@Controller('cost')
export class CostController {
  constructor(private readonly costService: CostService) {}

  @Get(':Keitaro_Id')
  async getByKeitaroId(
    @Param('Keitaro_Id', ParseIntPipe) keitaroId: number,
  ) {
    return this.costService.getByKeitaroId(keitaroId);
  }

  @Post(':Keitaro_Id')
  async createUnique(
    @Param('Keitaro_Id', ParseIntPipe) keitaroId: number,
    @Body() dto: CreateCostDto,
  ) {
    return this.costService.createUnique(keitaroId, dto.items || []);
  }

  @Put(':Keitaro_Id')
  async updateByKeitaroId(
    @Param('Keitaro_Id', ParseIntPipe) keitaroId: number,
    @Body() dto: UpdateCostDto,
  ) {
    return this.costService.updateByKeitaroId(keitaroId, dto);
  }

  @Delete(':Keitaro_Id')
  async deleteByKeitaroId(
    @Param('Keitaro_Id', ParseIntPipe) keitaroId: number,
  ) {
    return this.costService.deleteByKeitaroId(keitaroId);
  }
}
