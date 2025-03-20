import { BadRequestException, Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { CreateUserDTO } from '../user/dto';
import { AppError } from '../../common/constants/errors';
import { LoginUserDTO } from './dto';
import * as bcrypt from 'bcrypt';
import { AuthUserResponse } from './response';
import { TokenService } from '../token/token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  async registerUser(dto: CreateUserDTO): Promise<AuthUserResponse> {
    const existUser = await this.userService.findUserByEmail(dto.email);
    if (existUser) throw new BadRequestException(AppError.USER_EXIST);

    await this.userService.createUser(dto);
    const user = await this.userService.publicUser(dto.email);
    const tokens = await this.tokenService.generateJwtTokens(user);

    return { user, ...tokens };
  }

  async loginUser(dto: LoginUserDTO): Promise<AuthUserResponse> {
    const existUser = await this.userService.findUserByEmail(dto.email);
    if (!existUser) throw new BadRequestException(AppError.USER_NOT_EXIST);

    const validatePassword = bcrypt.compare(dto.password, existUser.password);
    if (!validatePassword) throw new BadRequestException(AppError.WRONG_DATA);

    const user = await this.userService.publicUser(dto.email);
    const tokens = await this.tokenService.generateJwtTokens(user);

    return { user, ...tokens };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const payload = await this.tokenService.validateRefreshToken(refreshToken);
    const user = await this.userService.publicUser(payload.email);

    const accessToken = await this.tokenService.generateAccessToken(user);
    return { accessToken };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revokeRefreshToken(refreshToken);
  }
}
