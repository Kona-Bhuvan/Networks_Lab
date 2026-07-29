import { Sequelize } from 'sequelize-typescript';
import { FileModel } from './file.model';
import { TestResultsModel } from './testResults.model';
import { TestDetailsModel } from './testDetails.model';
import Config from '../config';

export const sequelize = new Sequelize({
    dialect: 'postgres',
    host: Config.POSTGRES_HOST,
    database: Config.POSTGRES_DB,
    username: Config.POSTGRES_USER,
    password: Config.POSTGRES_PASSWORD,
    models: [FileModel, TestResultsModel, TestDetailsModel],
    logging: false,
});