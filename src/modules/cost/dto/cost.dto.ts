import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CostItemDto {
  @IsDateString()
  costDate: string;

  @IsOptional()
  @IsString()
  campaign?: string;

  @IsOptional()
  @IsString()
  adset?: string;

  @IsOptional()
  @IsString()
  ad?: string;

  @IsOptional()
  @IsString()
  fbId?: string;

  @IsOptional()
  @IsNumber()
  costMod?: number;

  @IsOptional()
  @IsString()
  costModCurrency?: string;

  @IsOptional()
  @IsNumber()
  costOriginal?: number;

  @IsOptional()
  @IsString()
  costOriginalCurrency?: string;

  @IsOptional()
  @IsString()
  log?: string;

  @IsOptional()
  @IsEnum(['new', 'applyed'])
  status?: 'new' | 'applyed';
}

export class CreateCostDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CostItemDto)
  items: CostItemDto[];
}

/** Тело для POST /cost: без полей — все записи; с start — от start (включительно), с end — до end (включительно). */
export class CostDateRangeDto {
  @ApiPropertyOptional({ example: '2025-01-01', description: 'yyyy-MM-dd' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'start must be yyyy-MM-dd',
  })
  start?: string;

  @ApiPropertyOptional({
    example: '2025-01-31',
    description: 'yyyy-MM-dd; только вместе со start',
  })
  @IsOptional()
  @ValidateIf((o) => o.start != null && o.start !== '')
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'end must be yyyy-MM-dd',
  })
  end?: string;
}

export class UpdateCostDto {
  @IsOptional()
  @IsDateString()
  costDate?: string;

  @IsOptional()
  @IsString()
  campaign?: string;

  @IsOptional()
  @IsString()
  adset?: string;

  @IsOptional()
  @IsString()
  ad?: string;

  @IsOptional()
  @IsString()
  fbId?: string;

  @IsOptional()
  @IsNumber()
  costMod?: number;

  @IsOptional()
  @IsString()
  costModCurrency?: string;

  @IsOptional()
  @IsNumber()
  costOriginal?: number;

  @IsOptional()
  @IsString()
  costOriginalCurrency?: string;

  @IsOptional()
  @IsString()
  log?: string;

  @IsOptional()
  @IsEnum(['new', 'applyed'])
  status?: 'new' | 'applyed';
}
