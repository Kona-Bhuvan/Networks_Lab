

export interface ProcessDataInterface {
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


export interface TestState {
    fileName: string | null,
    binaryId: string | null,
    running: boolean,
    testDetails: TestDetails[],
    timeTaken?: number,
}

export interface FinalSummary {
    numTestCases: number,
    numPassed: number,
    numFailed: number,
}

export enum TestStatus {
    Pending = "pending",
    Running = "running",
    Passed = "passed",
    Failed = "failed",
}
