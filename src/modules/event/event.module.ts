import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { Event } from './models/event.model';

@Module({
  imports: [SequelizeModule.forFeature([Event])],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
