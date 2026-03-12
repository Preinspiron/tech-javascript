import {
  AllowNull,
  Column,
  DataType,
  Model,
  Table,
  Unique,
} from 'sequelize-typescript';

@Table
export class BotSubscription extends Model {
  @AllowNull(false)
  @Unique
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  key: string;

  @AllowNull(true)
  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  chatId: string | null;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
    allowNull: false,
    comment: 'Comma separated Keitaro offer IDs tied to this key',
  })
  offerIds: string;

  @AllowNull(true)
  @Column({
    type: DataType.STRING,
    allowNull: true,
    comment: 'Optional human readable label for this key',
  })
  label: string | null;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'offer',
    comment: "Key type: 'offer' or 'company'",
  })
  type: string;

  @AllowNull(true)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'Hour of day (0-23) when daily stats should be sent, server time',
  })
  sendHour: number | null;
}

