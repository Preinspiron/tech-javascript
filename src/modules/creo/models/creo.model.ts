import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
  AutoIncrement,
  AllowNull,
} from 'sequelize-typescript';

@Table
export class Creo extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  })
  id: number;

  @AllowNull(false)
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @AllowNull(false)
  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  url: string;
}
