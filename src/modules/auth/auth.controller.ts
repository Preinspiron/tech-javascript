import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDTO } from '../user/dto';
import { LoginUserDTO } from './dto';
import { AuthUserResponse } from './response';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @ApiTags('API')
  @ApiResponse({
    status: 201,
    type: CreateUserDTO,
  })
  @Post('register')
  registerUsers(@Body() dto: CreateUserDTO): Promise<CreateUserDTO> {
    return this.authService.registerUser(dto);
  }
  @ApiTags('API')
  @ApiResponse({
    status: 200,
    type: AuthUserResponse,
  })
  @Post('login')
  loginUser(@Body() dto: LoginUserDTO): Promise<any> {
    return this.authService.loginUser(dto);
  }
}
