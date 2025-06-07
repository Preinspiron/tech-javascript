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

  @Column({ type: DataType.STRING, allowNull: true })
  pixel_id: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  fbclid: string;

  @Column({ type: DataType.STRING, allowNull: true })
  client_ip_address: string;

  @Column({ type: DataType.STRING(1200), allowNull: true })
  client_user_agent: string;

  @Column({ type: DataType.STRING, allowNull: true })
  sub_id: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  fbc: string;

  @Column({ type: DataType.STRING, allowNull: true })
  fbp: string;

  @Column({ type: DataType.STRING(1200), allowNull: true })
  event_source_url: string;

  @Column({ type: DataType.STRING, allowNull: true })
  type_source: string;

  @Column({ type: DataType.STRING, allowNull: true })
  referrer: string;

  @HasMany(() => Event, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  event: Event[];
}
