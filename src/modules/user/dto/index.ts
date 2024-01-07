import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDTO {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  email: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  password: string;
}

export class UpdateUserDTO {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsString()
  email: string;
}
