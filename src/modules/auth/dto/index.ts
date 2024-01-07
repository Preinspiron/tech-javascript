import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginUserDTO {
  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  email: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  password: string;
}
