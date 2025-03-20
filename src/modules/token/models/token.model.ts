import {
  AllowNull,
  Column,
  DataType,
  Default,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { User } from '../../user/models/user.model';

@Table
export class Token extends Model {
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    allowNull: false,
  })
  id: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  user_id: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  token: string;

  @AllowNull(false)
  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  expires_at: Date;

  @Default(DataType.NOW)
  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  created_at: Date;
}
