import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class UserResponse {
  @ApiProperty()
  @IsString()
  firstname: string;

  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsString()
  email: string;
}

export class AuthUserResponse {
  @ApiProperty()
  user: UserResponse;

  @ApiProperty()
  @IsString()
  accessToken: string;

  @ApiProperty()
  @IsString()
  refreshToken: string;
}
