import express from 'express';
import cors from 'cors';
import apiRouter from './api/stages/routes';
import authRouter from './api/auth/routes';
import authMiddleware from './middleware/auth';
import { errorHandler } from './middleware/error';
import logger from './middleware/logger';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Core } from './core/Core';
import path from 'path';
import { sequelize } from './models';
import Config from './config';

// Global safety net: prevent the main process from crashing due to
// unhandled errors from sub-container test sockets or other async issues.
process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION] The main process caught an unhandled error (not crashing):', err.message);
    console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[UNHANDLED REJECTION] The main process caught an unhandled promise rejection (not crashing):', reason);
});

const app = express();
const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "*"
    }
});

sequelize.authenticate()
    .then(() => {
        console.log("Databse connected!");
        return sequelize.sync({ alter: Config.DEBUG });
    })
    .catch((err) => {
        console.log("Unable to connect to db", err);
    })
app.use(cors());
app.use(express.static(path.join(process.cwd(), 'public')));

app.use(logger);
app.use('/token', authRouter);
app.use(authMiddleware);
app.use('/stage', apiRouter)
app.use(errorHandler);




Core.iniitialize(httpServer, io, app);