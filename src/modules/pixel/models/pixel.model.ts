import {
  Column,
  DataType,
  Default,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { Event } from '../../event/models/event.model';

@Table
export class Pixel extends Model {
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    allowNull: false,
  })
  id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  pixel_id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  fbclid: string;

  @Column({ type: DataType.STRING, allowNull: true })
  client_ip_address: string;

  @Column({ type: DataType.STRING, allowNull: true })
  client_user_agent: string;

  @Column({ type: DataType.STRING, allowNull: false })
  sub_id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  fbc: string;

  @Column({ type: DataType.STRING, allowNull: false })
  fbp: string;

  @Column({ type: DataType.STRING, allowNull: false })
  event_source_url: string;

  @HasMany(() => Event, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  event: Event[];
}
