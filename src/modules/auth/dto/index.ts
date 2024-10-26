import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginUserDTO {
  @IsNotEmpty()
  @ApiProperty()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @IsNotEmpty()
  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/[A-Za-z]/, { message: 'Password must contain letters' })
  @Matches(/\d/, { message: 'Password must contain numbers' })
  @Matches(/[!@#$%^&*(),.?":{}|<>]/, {
    message: 'Password must contain a special character',
  })
  password: string;
}
