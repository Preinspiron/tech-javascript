import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { JwtService } from '@nestjs/jwt';
import { SequelizeModule } from '@nestjs/sequelize';
import { Token } from './models/token.model';

@Module({
  imports: [SequelizeModule.forFeature([Token])],
  providers: [TokenService, JwtService],
  exports: [TokenService],
})
export class TokenModule {}
