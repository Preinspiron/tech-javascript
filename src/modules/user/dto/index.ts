import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDTO {
  @ApiProperty()
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name can be at most 50 characters long' })
  firstname: string;

  @ApiProperty()
  @IsString()
  @MinLength(2, { message: 'Username must be at least 2 characters long' })
  @MaxLength(50, { message: 'Username can be at most 50 characters long' })
  username: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/[A-Za-z]/, { message: 'Password must contain letters' })
  @Matches(/\d/, { message: 'Password must contain numbers' })
  @Matches(/[!@#$%^&*(),.?":{}|<>]/, {
    message: 'Password must contain a special character',
  })
  password: string;
}

export class UpdateUserDTO {
  @ApiProperty()
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name can be at most 50 characters long' })
  firstname: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Username must be at least 2 characters long' })
  @MaxLength(50, { message: 'Username can be at most 50 characters long' })
  username: string;

  @ApiProperty()
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;
}
