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
    const token = await this.tokenService.generateJwtToken(user);

    return { user, token };
  }

  async loginUser(dto: LoginUserDTO): Promise<AuthUserResponse> {
    const existUser = await this.userService.findUserByEmail(dto.email);
    if (!existUser) throw new BadRequestException(AppError.USER_NOT_EXIST);

    const validatePassword = bcrypt.compare(dto.password, existUser.password);
    if (!validatePassword) throw new BadRequestException(AppError.WRONG_DATA);

    const user = await this.userService.publicUser(dto.email);
    const token = await this.tokenService.generateJwtToken(user);

    return { user, token };
  }
}
