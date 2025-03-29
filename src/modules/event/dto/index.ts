import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateEventDTO {
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @IsString()
  @IsNotEmpty()
  event_name: string;

  @IsString()
  @IsNotEmpty()
  event_id: string;

  @IsString()
  @IsNotEmpty()
  event_time: string;

  @IsString()
  @IsNotEmpty()
  event_source_url: string;

  @IsString()
  @IsOptional()
  test_event_code?: string | null;
}
