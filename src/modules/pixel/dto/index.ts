import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserPixelDTO {
  @IsString()
  // @IsNotEmpty()
  @IsOptional()
  pixel_id: string;

  @IsString()
  // @IsNotEmpty()
  @IsOptional()
  fbclid: string;

  @IsString()
  // @IsNotEmpty()
  @IsOptional()
  sub_id: string;

  @IsString()
  // @IsNotEmpty()
  @IsOptional()
  event_name: string;

  @IsString()
  @IsOptional()
  event_source_url: string;

  @IsString()
  @IsOptional()
  client_user_agent?: string;

  @IsString()
  @IsOptional()
  test_event_code?: string;

  @IsString()
  @IsOptional()
  type_source?: string;

  @IsString()
  @IsOptional()
  referrer?: string;
}
