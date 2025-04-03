import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateEventDTO {
  @IsString()
  // @IsNotEmpty()
  @IsOptional()
  user_id: string;

  @IsString()
  // @IsNotEmpty()
  @IsOptional()
  event_name: string;

  @IsString()
  // @IsNotEmpty()
  @IsOptional()
  event_id: string;

  @IsString()
  // @IsNotEmpty()
  @IsOptional()
  event_time: string;

  @IsString()
  // @IsNotEmpty()
  @IsOptional()
  event_source_url: string;

  @IsString()
  @IsOptional()
  test_event_code?: string | null;
}
