import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Cost } from './models/cost.model';
import { CostService } from './cost.service';
import { CostController } from './cost.controller';

@Module({
  imports: [SequelizeModule.forFeature([Cost])],
  providers: [CostService],
  controllers: [CostController],
})
export class CostModule {}
