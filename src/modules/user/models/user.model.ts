import {
  AllowNull,
  Column,
  DataType,
  HasMany,
  Model,
  Table,
  Unique,
} from 'sequelize-typescript';
import { Watchlist } from '../../watchlist/models/watchlist.model';

@Table
export class User extends Model {
  @AllowNull(false)
  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      len: [2, 50],
    },
  })
  firstname: string;

  @AllowNull(false)
  @Unique
  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      len: [2, 50],
    },
  })
  username: string;

  @AllowNull(false)
  @Unique
  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      isEmail: true,
    },
  })
  email: string;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      len: [8, 100],
      is: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/,
    },
  })
  password: string;

  @HasMany(() => Watchlist, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  watchlist: Watchlist[];
}
