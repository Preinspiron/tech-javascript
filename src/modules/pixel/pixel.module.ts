import { Module } from '@nestjs/common';
import { PixelService } from './pixel.service';
import { PixelController } from './pixel.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Pixel } from './models/pixel.model';
import { EventModule } from '../event/event.module';

@Module({
  imports: [SequelizeModule.forFeature([Pixel]), EventModule],
  providers: [PixelService],
  controllers: [PixelController],
})
export class PixelModule {}
