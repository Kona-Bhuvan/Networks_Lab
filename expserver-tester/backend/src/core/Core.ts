import { Socket, StageTest, TestDetails, Test, TestState, TestStatus } from "../types";
import { Server } from 'socket.io';
import { Server as HttpServer } from 'http'
import { StageWatcher } from "./StageWatcher";
import { StageRunner } from "./StageRunner";
import { Express } from "express";
import { TESTER_PORT, WEBSOCKET_PORT } from "../constants";
import Config from "../config";
import { tests } from "../tests";
import { createClient } from 'redis'
import { FileModel } from '../models/file.model'

enum EmitEvents {
    CurrentState = 'current-state',
    NoBinary = 'no-binary',
    ConnectionAck = 'connection-ack',
    Reconnect = 'reconnect'
}

enum ReceiveEvents {
    Connection = 'connection',
    RequestState = 'request-state',
    Run = 'run',
    Stop = 'stop',
    Disconnect = 'disconnect',
}

export class Core {
    public static runners: StageRunner[];
    public static watchers: StageWatcher[];
    public static httpServer: HttpServer;
    public static socketIo: Server;
    public static expressApp: Express;


    public static iniitialize(httpServer: HttpServer, socketIo: Server, expressApp: Express) {
        Core.runners = [];
        Core.watchers = [];
        Core.httpServer = httpServer;
        Core.socketIo = socketIo;
        Core.expressApp = expressApp;

        Core.initializeServer()
    }

    private static stageTests: StageTest = tests;


    public static deleteRunner(stageRunner: StageRunner) {
        Core.runners = Core.runners.filter(runner => (runner !== stageRunner));
    }

    private static findStageRunner(watcher: StageWatcher): StageRunner {
        const { stageNo, userId } = watcher;
        const runner = this.runners.find(runner => {
            return ((runner.userId == userId) && (runner.stageNo == stageNo))
        });
        return runner;
    }

    private static async handleNoExistingRunner(watcher: StageWatcher): Promise<TestState> {
        const { stageNo, userId } = watcher;

        const file = await FileModel.findOne({
            where: {
                userId,
                stageNo,
            },
        });

        const testDetails = this.getTests(stageNo);
        if (!testDetails) {
            return ({
                binaryId: null,
                fileName: null,
                running: false,
                testDetails: [],
            })
        }

        if (file) {
            const runner = new StageRunner(
                userId,
                stageNo,
                file,
            )

            this.runners.push(runner);


            const previousResult = await runner.fetchPreviousData();
            if (previousResult) {
                return ({
                    binaryId: file?.binaryId || null,
                    fileName: file?.fileName || null,
                    running: false,
                    timeTaken: previousResult.timeTaken,
                    testDetails: testDetails.map<TestDetails>((test, index) => {
                        const prevTest = previousResult.testDetails[index];
                        return {
                            title: test.title,
                            description: test.description,
                            testInput: test.testInput,
                            expectedBehavior: test.expectedBehavior,
                            observedBehavior: prevTest?.observedBehavior ?? null,
                            status: prevTest?.status ?? TestStatus.Pending,
                        };
                    })
                })
            }
            return ({
                binaryId: file.binaryId,
                fileName: file.fileName,
                running: false,
                testDetails: testDetails.map<TestDetails>(test => ({
                    title: test.title,
                    description: test.description,
                    testInput: test.testInput,
                    expectedBehavior: test.expectedBehavior,
                    observedBehavior: null,
                    status: TestStatus.Pending,
                }))

            })
        }

        return ({
            binaryId: null,
            fileName: null,
            running: false,
            testDetails: testDetails.map(test => ({
                title: test.title,
                description: test.description,
                testInput: test.testInput,
                expectedBehavior: test.expectedBehavior,
                observedBehavior: null,
                status: TestStatus.Pending,
            }))
        })
    }

    private static async handleNewSubscriber(runner: StageRunner, watcher: StageWatcher): Promise<TestState> {
        runner.attachNewSubscriber(watcher);
        const currentState = runner.currentState;
        watcher.stageRunner = runner;

        const previousResult = await runner.fetchPreviousData();
        if (previousResult && !runner.running) {
            return ({
                binaryId: runner.binaryId,
                fileName: runner.fileName,
                running: false,
                timeTaken: previousResult.timeTaken,
                testDetails: currentState.map<TestDetails>((test, index) => {
                    const prevTest = previousResult.testDetails[index];
                    return {
                        title: test.title,
                        description: test.description,
                        testInput: test.testInput,
                        expectedBehavior: test.expectedBehavior,
                        observedBehavior: prevTest?.observedBehavior ?? null,
                        status: prevTest?.status ?? TestStatus.Pending,
                    };
                })
            })
        }


        return ({
            binaryId: runner.binaryId,
            fileName: runner.fileName,
            running: runner.running,
            testDetails: currentState,
        })
    }

    private static async handleNewWatcher(socket: Socket, stageNo: number, userId: string) {
        const watcher = new StageWatcher(socket, userId);
        socket.watcher = watcher;

        watcher.changeListeningStage(stageNo);
        this.watchers.push(watcher);

        const runner = this.findStageRunner(watcher);
        if (runner) {
            const currentState = await this.handleNewSubscriber(runner, watcher);
            socket.emit(EmitEvents.CurrentState, currentState);
        }
        else {
            const currentState = await this.handleNoExistingRunner(watcher);
            socket.emit(EmitEvents.CurrentState, currentState);
        }
    }

    private static async handleExistingWatcher(socket: Socket, stageNo: number) {
        const watcher = socket.watcher;

        const prevRunner = watcher.stageRunner;
        if (prevRunner) {
            prevRunner.detachSubscriber(watcher);
        }

        watcher.changeListeningStage(stageNo);
        const newRunner = this.findStageRunner(watcher);
        if (newRunner) {
            const currentState = await this.handleNewSubscriber(newRunner, watcher);
            socket.emit(EmitEvents.CurrentState, currentState);
        }
        else {
            const currentState = await this.handleNoExistingRunner(watcher);
            socket.emit(EmitEvents.CurrentState, currentState);
        }
    }

    private static async handleRequestState(socket: Socket, stageNo: number, userId: string) {
        if (!socket.watcher)
            await this.handleNewWatcher(socket, stageNo, userId);
        else
            await this.handleExistingWatcher(socket, stageNo);
    }

    private static async handleStartRunner(socket: Socket) {
        if (!socket.watcher)
            return;
        const { userId, stageNo } = socket.watcher;
        const file = await FileModel.findOne({
            where: {
                userId,
                stageNo,
            },
        });

        if (!file)
            return socket.emit(EmitEvents.NoBinary);


        const existingRunner = this.findStageRunner(socket.watcher)

        let runner: StageRunner;
        if (!existingRunner) {
            runner = new StageRunner(
                userId,
                stageNo,
                file,
            )
            Core.runners.push(runner);
        }
        else {
            runner = existingRunner;
        }

        this.watchers.forEach(watcher => {
            if (watcher.userId == userId && watcher.stageNo == stageNo) {
                watcher.stageRunner = runner;
                runner.attachNewSubscriber(watcher);
            }
        })


        await runner.run();
    }

    private static handleStopRunner(socket: Socket) {
        if (!socket.watcher)
            return;
        const { stageRunner } = socket.watcher;
        if (stageRunner && stageRunner.running) {
            stageRunner.kill(true);

            Core.runners = Core.runners.filter(runner => (runner !== stageRunner));
        }
    }


    private static handleSocketDisconnected(socket: Socket) {
        if (!socket.watcher)
            return;
        const { stageRunner } = socket.watcher;
        stageRunner?.detachSubscriber(socket.watcher);

        Core.watchers = Core.watchers.filter(watcher => (watcher !== socket.watcher));
        socket.watcher = null;
    }


    public static initializeServer = async (): Promise<void> => {
        this.expressApp.listen(TESTER_PORT, () => console.log(`Server running on port ${TESTER_PORT}`));
        this.httpServer.listen(WEBSOCKET_PORT, () => console.log(`Websocket running on port ${WEBSOCKET_PORT}`));
        console.log("current working directory: ", Config.HOST_PWD);

        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        const redis = createClient({ url: redisUrl });
        await redis.connect();

        this.socketIo.use((socket, next) => {
            console.log(socket.handshake.auth)
            const clientId = socket.handshake.auth.clientId;
            if (!clientId)
                return next(new Error("clientId required"))
            next();
        });

        this.socketIo.on(ReceiveEvents.Connection, async (socket: Socket) => {
            const clientId = socket.data.clientId;

            const sessionData = await redis.get(`session:${clientId}`);
            if (sessionData) {
                const data: { stageNo: number, userId: string } = JSON.parse(sessionData);
                const watcher = new StageWatcher(socket, data.userId);
                socket.watcher = watcher;

                watcher.changeListeningStage(data.stageNo);
                this.watchers.push(watcher);

                const runner = this.findStageRunner(watcher);
                if (runner) {
                    const currentState = await this.handleNewSubscriber(runner, watcher);
                    socket.emit(EmitEvents.ConnectionAck, { data: currentState });
                }
                else {
                    const currentState = await this.handleNoExistingRunner(watcher);
                    socket.emit(EmitEvents.ConnectionAck, { data: currentState });
                }
            }
            else {
                console.log("emitted ack")
                socket.emit(EmitEvents.ConnectionAck, { data: null });
            }

            socket.on(ReceiveEvents.RequestState, async (data: { stageNo: number, userId: string }) => {
                const { stageNo, userId } = data;
                await redis.set(`session:${clientId}`, JSON.stringify({ stageNo, userId }));
                void this.handleRequestState(socket, stageNo, userId);
            })

            socket.on(ReceiveEvents.Run, () => {
                void this.handleStartRunner(socket);
            })

            socket.on(ReceiveEvents.Stop, () => {
                void this.handleStopRunner(socket);
            })


            socket.on(ReceiveEvents.Disconnect, () => {
                this.handleSocketDisconnected(socket);
            })
        })
    }


    public static getDescription(stageNo: number | string): string | null {
        if (!this.stageTests[`stage${stageNo}`])
            return null;

        return this.stageTests[`stage${stageNo}`].descriptionFilePath;
    }

    public static getTests(stageNo: number | string): Test[] | null {
        if (!this.stageTests[`stage${stageNo}`])
            return null;

        return this.stageTests[`stage${stageNo}`].tests.map(test => ({ ...test, status: TestStatus.Pending }));
    }


    public static requiresDummyServer(stageNo: number | string): boolean {
        if (!this.stageTests[`stage${stageNo}`])
            return false;

        return this.stageTests[`stage${stageNo}`].requiresDummyServer;
    }

    public static requiresXpsConfig(stageNo: number | string): boolean {
        if (!this.stageTests[`stage${stageNo}`])
            return false;

        return !!this.stageTests[`stage${stageNo}`].requiresXpsConfig;
    }

    public static getPublicPath(stageNo: number | string): string {
        if (!this.stageTests[`stage${stageNo}`])
            return 'common';
        const customFilePath = this.stageTests[`stage${stageNo}`].customPublicPath
        return customFilePath
            ? customFilePath
            : 'common'
    }
}