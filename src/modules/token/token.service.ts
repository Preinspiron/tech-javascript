import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../user/models/user.model';
import { InjectModel } from '@nestjs/sequelize';
import { Token } from './models/token.model';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(Token) private readonly tokenRepositories: typeof Token,
  ) {}

  async generateAccessToken(user: User): Promise<string> {
    const payload = { id: user.id, email: user.email };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt_access_secret'),
      expiresIn: this.configService.get<string>('expire_access_jwt') + 's', // 15 минут
    });
  }

  async generateJwtTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      id: user.id,
      email: user.email,
    };
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt_access_secret'),
      expiresIn: this.configService.get('expire_access_jwt') + 's',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('jwt_refresh_secret'),
      expiresIn: this.configService.get('expire_refresh_jwt') + 's',
    });

    await this.tokenRepositories.create({
      user_id: user.id,
      token: refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { accessToken, refreshToken };
  }

  async validateRefreshToken(token: string): Promise<any> {
    const tokenRecord = await this.tokenRepositories.findOne({
      where: { token },
    });

    if (!tokenRecord || tokenRecord.expires_at < new Date()) {
      if (tokenRecord) {
        await this.revokeRefreshToken(token);
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return this.jwtService.verify(token, {
      secret: this.configService.get('jwt_refresh_secret'),
    });
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.tokenRepositories.destroy({ where: { token } });
  }
}
