import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Event } from './models/event.model';
import { Attributes } from 'sequelize';

@Injectable()
export class EventService {
  constructor(@InjectModel(Event) private readonly eventModel: typeof Event) {}

  async createEvent(eventData: Omit<Attributes<Event>, 'id'>): Promise<Event> {
    try {
      return await this.eventModel.create(eventData);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to create event: ${error.message}`,
      );
    }
  }
}
