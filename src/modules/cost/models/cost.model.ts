import {
  AllowNull,
  AutoIncrement,
  Column,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

@Table({
  tableName: 'Costs',
})
export class Cost extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column({
    type: DataType.INTEGER,
  })
  id: number;

  @AllowNull(false)
  @Column({
    type: DataType.DATEONLY,
    allowNull: false,
    field: 'costDate',
  })
  costDate: string;

  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'Campaign',
  })
  campaign: string | null;

  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'Adset',
  })
  adset: string | null;

  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'Ad',
  })
  ad: string | null;

  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'FB_Id',
  })
  fbId: string | null;

  @AllowNull(true)
  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: true,
    field: 'Cost.mod',
  })
  costMod: number | null;

  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'Cost.mod.currency',
  })
  costModCurrency: string | null;

  @AllowNull(true)
  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: true,
    field: 'Cost.original',
  })
  costOriginal: number | null;

  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'Cost.original.currency',
  })
  costOriginalCurrency: string | null;

  @AllowNull(false)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: 'Keitaro_Id',
  })
  keitaroId: number;

  @AllowNull(true)
  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: 'Log',
  })
  log: string | null;

  @Default('new')
  @AllowNull(false)
  @Column({
    type: DataType.ENUM('new', 'applyed'),
    allowNull: false,
    defaultValue: 'new',
    field: 'Status',
  })
  status: 'new' | 'applyed';
}
