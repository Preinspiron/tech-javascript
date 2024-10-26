import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDTO } from '../user/dto';
import { LoginUserDTO } from './dto';
import { AuthUserResponse } from './response';
import { ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiTags('API')
  @ApiResponse({
    status: 201,
    type: CreateUserDTO,
  })
  @Post('register')
  registerUsers(@Body() dto: CreateUserDTO): Promise<AuthUserResponse> {
    try {
      return this.authService.registerUser(dto);
    } catch (error) {
      throw error;
    }
  }

  @ApiTags('API')
  @ApiResponse({
    status: 200,
    type: AuthUserResponse,
  })
  @Post('login')
  loginUser(@Body() dto: LoginUserDTO): Promise<AuthUserResponse> {
    try {
      return this.authService.loginUser(dto);
    } catch (error) {
      throw error;
    }
  }
}
