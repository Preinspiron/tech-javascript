import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserPixelDTO {
  @IsString()
  @IsNotEmpty()
  pixel_id: string;

  @IsString()
  @IsNotEmpty()
  fbclid: string;

  @IsString()
  @IsNotEmpty()
  sub_id: string;

  @IsString()
  @IsNotEmpty()
  event_name: string;

  @IsString()
  @IsNotEmpty()
  event_source_url: string;

  @IsString()
  @IsOptional()
  client_user_agent?: string;

  @IsString()
  @IsOptional()
  test_event_code?: string;
}
