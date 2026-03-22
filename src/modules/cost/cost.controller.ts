import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthHeaderGuard } from '../../guards/auth-header.guard';
import { SWAGGER_AUTH_HEADER } from '../../constants/swagger-auth.constants';
import { CostService } from './cost.service';
import { CostDateRangeDto, CreateCostDto, UpdateCostDto } from './dto/cost.dto';

@ApiSecurity(SWAGGER_AUTH_HEADER)
@UseGuards(AuthHeaderGuard)
@Controller('api/cost')
export class CostController {
  constructor(private readonly costService: CostService) {}

  @ApiTags('Cost')
  @Post()
  @ApiOperation({
    // summary: 'Все косты или по диапазону дат costDate',
    // description:
    // 'Пустое тело или без start — все записи. С полем start (yyyy-MM-dd) — с этой даты включительно; end (yyyy-MM-dd) необязателен — тогда без верхней границы.',
  })
  @ApiBody({ type: CostDateRangeDto, required: false })
  @ApiResponse({ status: 200, description: 'Список Cost' })
  async findAll(@Body() dto?: CostDateRangeDto) {
    return this.costService.findAll(dto);
  }
  @ApiTags('Cost')
  @Get(':Keitaro_Id')
  async getByKeitaroId(@Param('Keitaro_Id', ParseIntPipe) keitaroId: number) {
    return this.costService.getByKeitaroId(keitaroId);
  }
  @ApiTags('Cost')
  @Post(':Keitaro_Id')
  async createUnique(
    @Param('Keitaro_Id', ParseIntPipe) keitaroId: number,
    @Body() dto: CreateCostDto,
  ) {
    return this.costService.createUnique(keitaroId, dto.items || []);
  }
  @ApiTags('Cost')
  @Put(':Keitaro_Id')
  async updateByKeitaroId(
    @Param('Keitaro_Id', ParseIntPipe) keitaroId: number,
    @Body() dto: UpdateCostDto,
  ) {
    return this.costService.updateByKeitaroId(keitaroId, dto);
  }
  @ApiTags('Cost')
  @Delete(':Keitaro_Id')
  async deleteByKeitaroId(
    @Param('Keitaro_Id', ParseIntPipe) keitaroId: number,
  ) {
    return this.costService.deleteByKeitaroId(keitaroId);
  }
}
