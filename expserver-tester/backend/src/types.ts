import type { Request as Req, Response as Res, NextFunction as NextFn } from "express";
import type { Socket as Soc } from "socket.io";
import type { StageWatcher } from "./core/StageWatcher";


export enum FileType {
    DIRECTORY = 'directory',
    FILE = 'file',
}

export type FileEntry = {
    type: FileType.FILE;
    mimeType: string;
    path?: string;
};

export type DirectoryEntry = {
    type: FileType.DIRECTORY;
    items: {
        [path: string]: FileSystemEntry;
    };
};

export type FileSystemEntry = FileEntry | DirectoryEntry;
export type DirectoryBrowser = {
    [path: string]: DirectoryEntry,
}

export interface ResourceStats {
    cpu: number,
    mem: number,
}

export interface TestDetails {
    title: string,
    description: string,
    testInput: string | null,
    expectedBehavior: string | null,
    observedBehavior: string | null,
    status: TestStatus;
}

export interface Test {
    requireRestart?: boolean,
    title: string,
    description: string,
    testInput?: string,
    expectedBehavior: string | null,
    status: TestStatus;
    testFunction: TestFunction;
}

export type TestFunctionReturnType = {
    passed: boolean,
    testInput?: string,
    expectedBehavior?: string,
    observedBehavior?: string,
    cleanup?: () => void,
}

export type TestFunction = (...args: any[]) => Promise<TestFunctionReturnType>

export interface TestState {
    binaryId: string | null,
    fileName: string | null,
    running: boolean,
    testDetails: TestDetails[],
    timeTaken?: number,
}

export enum TestStatus {
    Pending = "pending",
    Running = "running",
    Passed = "passed",
    Failed = "failed",
}

export interface StageTest {
    [stageNo: string]: {
        stageName: string,
        descriptionFilePath: string,
        requiresDummyServer: boolean,
        requiresXpsConfig?: boolean,
        customPublicPath?: string,
        tests: Omit<Test, 'status'>[];
    }
}

export interface HttpResponse {
    statusCode: number,
    headers: Record<string, string>,
    body?: any,
}

export interface HttpRequestTest {
    title: string,
    description: string,
    info: string,
    request: (containerName: string) => string,
    expectedResponse: HttpResponse,
}



export type Request = Req & {
    user: string,
    file: {
        path: string,
        originalname: string,
    }
};
export type Response = Res;
export type NextFunction = NextFn;

export type Socket = Soc & {
    watcher?: StageWatcher
};