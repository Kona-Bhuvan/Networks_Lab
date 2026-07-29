import {
    Table,
    Column,
    Model,
    DataType,
    ForeignKey,
    BelongsTo,
} from 'sequelize-typescript';
import { TestResultsModel } from './testResults.model';

@Table({ tableName: 'TestDetails', timestamps: false })
export class TestDetailsModel extends Model {
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
    id!: string;

    @Column(DataType.STRING)
    testInput!: string;

    @Column(DataType.STRING)
    expectedBehaviour!: string;

    @Column(DataType.STRING)
    observedBehaviour!: string;

    @Column(DataType.STRING)
    status!: string;

    @ForeignKey(() => TestResultsModel)
    @Column({ type: DataType.UUID, allowNull: true })
    testResultsId?: string;

    @BelongsTo(() => TestResultsModel, { onDelete: 'CASCADE' })
    testResults?: TestResultsModel;
}
