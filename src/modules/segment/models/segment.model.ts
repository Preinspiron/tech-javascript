import { Column, DataType, Default, Model, Table } from 'sequelize-typescript';

@Table
export class Segment extends Model {
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.STRING,
    primaryKey: true,
    allowNull: false,
  })
  userId: string;

  @Column({ type: DataType.STRING, allowNull: true })
  ip: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  origin: string;

  @Column({ type: DataType.STRING, allowNull: true })
  external_id: string;

  @Column({ type: DataType.STRING, allowNull: true })
  event: string;

  @Column({ type: DataType.STRING, allowNull: true })
  type: string;

  @Column({ type: DataType.STRING, allowNull: true })
  value: string;

  @Column({ type: DataType.STRING(255), allowNull: true })
  writeKey: string;

  @Column({ type: DataType.STRING(1200), allowNull: true })
  UA: string;

  @Column({ type: DataType.STRING, allowNull: true })
  keitato_status: string;

  @Column({ type: DataType.STRING, allowNull: true })
  segment_status: string;

  @Column({ type: DataType.STRING(500), allowNull: true })
  fbc: string;

  @Column({ type: DataType.STRING, allowNull: true })
  fbp: string;
}
