import {
  AllowNull,
  Column,
  DataType,
  Default,
  HasMany,
  Model,
  Table,
  Unique,
} from 'sequelize-typescript';
import { Watchlist } from '../../watchlist/models/watchlist.model';
import { Token } from '../../token/models/token.model';

@Table
export class User extends Model {
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    allowNull: false,
  })
  id: string;

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
  })
  password: string;

  @HasMany(() => Watchlist, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  watchlist: Watchlist[];

  @HasMany(() => Token, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  refreshTokens: Token[];
}
