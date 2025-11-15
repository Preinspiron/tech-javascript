import { Module } from '@nestjs/common';
import { CreoService } from './creo.service';
import { CreoController } from './creo.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Creo } from './models/creo.model';

@Module({
  imports: [SequelizeModule.forFeature([Creo])],
  providers: [CreoService],
  controllers: [CreoController],
})
export class CreoModule {}

