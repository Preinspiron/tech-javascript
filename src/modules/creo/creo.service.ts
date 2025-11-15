import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Creo } from './models/creo.model';

@Injectable()
export class CreoService {
  constructor(
    @InjectModel(Creo) private readonly creoModel: typeof Creo,
  ) {}

  async getUrlByName(name: string): Promise<string> {
    try {
      const creo = await this.creoModel.findOne({
        where: { name },
      });

      if (!creo) {
        throw new NotFoundException(`Creo with name "${name}" not found`);
      }

      return creo.url;
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      throw new Error(err);
    }
  }
}

