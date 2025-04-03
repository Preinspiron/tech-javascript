import {
  Column,
  DataType,
  Default,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Pixel } from '../../pixel/models/pixel.model';

@Table
export class Event extends Model {
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    allowNull: false,
  })
  id: string;

  @ForeignKey(() => Pixel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  user_id: string;

  @Column({ type: DataType.STRING, allowNull: true })
  event_name: string;

  @Column({ type: DataType.STRING, allowNull: true })
  event_id: string;

  @Column({ type: DataType.STRING, allowNull: true })
  event_time: string;

  @Column({ type: DataType.STRING, allowNull: true })
  test_event_code: string;
}
