import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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
