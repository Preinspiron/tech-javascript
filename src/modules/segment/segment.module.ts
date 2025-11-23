import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { SegmentController } from './segment.controller';
import { SegmentService } from './segment.service';
import { Segment } from './models/segment.model';

@Module({
  imports: [SequelizeModule.forFeature([Segment])],
  controllers: [SegmentController],
  providers: [SegmentService],
})
export class SegmentModule {}
