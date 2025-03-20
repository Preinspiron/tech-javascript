import {
  AllowNull,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { User } from '../../user/models/user.model';

@Table
export class Watchlist extends Model {
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  user: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      len: [3, 50],
    },
  })
  name: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      len: [3, 30],
    },
  })
  assetId: string;
}
