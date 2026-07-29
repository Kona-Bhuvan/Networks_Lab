import {
    Table,
    Column,
    Model,
    DataType,
    HasMany,
    Unique,
} from 'sequelize-typescript';
import { TestDetailsModel } from './testDetails.model';

@Table({ tableName: 'TestResults', timestamps: false })
export class TestResultsModel extends Model {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    id!: string;

    @Column(DataType.INTEGER)
    timeTaken!: number;

    @Unique('user_stage_unique')
    @Column(DataType.STRING)
    userId!: string;

    @Unique('user_stage_unique')
    @Column(DataType.INTEGER)
    stageNo!: number;

    @HasMany(() => TestDetailsModel)
    testDetails!: TestDetailsModel[];
}
