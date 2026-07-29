import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'File', timestamps: false })
export class FileModel extends Model {
    @Column({ type: DataType.STRING, primaryKey: true })
    binaryId!: string;

    @Column({ type: DataType.STRING })
    fileName!: string;

    @Column({ type: DataType.STRING })
    filePath!: string;

    @Column({ type: DataType.INTEGER })
    stageNo!: number;

    @Column({ type: DataType.STRING })
    userId!: string;
}
