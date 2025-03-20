import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDTO } from '../user/dto';
import { LoginUserDTO } from './dto';
import { AuthUserResponse } from './response';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-guard';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @ApiTags('API')
  @ApiResponse({
    status: 201,
    type: AuthUserResponse,
  })
  @Post('register')
  async registerUsers(
    @Body() dto: CreateUserDTO,
    @Res() res: Response,
  ): Promise<void> {
    const { user, accessToken, refreshToken } =
      await this.authService.registerUser(dto);
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ user, accessToken });
  }

  @ApiTags('API')
  @ApiResponse({
    status: 200,
    type: AuthUserResponse,
  })
  @Post('login')
  async loginUser(
    @Body() dto: LoginUserDTO,
    @Res() res: Response,
  ): Promise<void> {
    const { user, accessToken, refreshToken } =
      await this.authService.loginUser(dto);
    const isProduction =
      this.configService.get<string>('node_env') === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ user, accessToken });
  }

  @Post('refresh')
  async refreshToken(@Req() req: Request, @Res() res: Response): Promise<void> {
    const refreshToken = req.cookies['refreshToken'];
    if (!refreshToken)
      throw new UnauthorizedException('Refresh token not provided');

    const { accessToken } = await this.authService.refreshToken(refreshToken);
    res.json({ accessToken });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request): Promise<void> {
    const refreshToken = req.cookies['refreshToken'];
    if (!refreshToken)
      throw new UnauthorizedException('Refresh token not provided');

    return this.authService.logout(refreshToken);
  }
}
