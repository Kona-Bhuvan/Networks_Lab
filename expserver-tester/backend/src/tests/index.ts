import { StageTest } from "../types";
import { stageTests } from "./stages";

export const tests: StageTest = {
    stage1: {
        stageName: "TCP Server",
        descriptionFilePath: "/description/stage1.md",
        requiresDummyServer: false,
        tests: stageTests.stage1,
    },
    stage3: {
        stageName: 'UDP Multithreading',
        descriptionFilePath: "/description/stage3.md",
        requiresDummyServer: false,
        tests: stageTests.stage3,
    },
    stage4: {
        stageName: "Linux Epoll",
        descriptionFilePath: "/description/stage4.md",
        requiresDummyServer: false,
        tests: stageTests.stage4,
    },
    stage5: {
        stageName: 'TCP Proxy',
        descriptionFilePath: "/description/stage5.md",
        requiresDummyServer: true,
        tests: stageTests.stage5,
    },
    stage6: {
        stageName: "Listener and Connection Module",
        descriptionFilePath: "/description/stage6.md",
        requiresDummyServer: false,
        tests: stageTests.stage6,
    },
    stage7: {
        stageName: "Core and Loop Modules",
        descriptionFilePath: "/description/stage7.md",
        requiresDummyServer: false,
        tests: stageTests.stage7,
    },
    stage8: {
        stageName: "Non-blocking Sockets",
        descriptionFilePath: "/description/stage8.md",
        requiresDummyServer: false,
        tests: stageTests.stage8,
    },
    stage9: {
        stageName: "Epoll Edge Triggered",
        descriptionFilePath: "/description/stage9.md",
        requiresDummyServer: false,
        tests: stageTests.stage9,
    },
    stage10: {
        stageName: "Pipe Module",
        descriptionFilePath: "/description/stage10.md",
        requiresDummyServer: false,
        customPublicPath: 'large-files',
        tests: stageTests.stage10,
    },
    stage11: {
        stageName: "Upstream Module",
        descriptionFilePath: "/description/stage11.md",
        requiresDummyServer: true,
        tests: stageTests.stage11,
    },
    stage12: {
        stageName: "File Module",
        descriptionFilePath: "/description/stage12.md",
        requiresDummyServer: true,
        tests: stageTests.stage12,
    },
    stage13: {
        stageName: "Session Module",
        descriptionFilePath: "/description/stage13.md",
        requiresDummyServer: true,
        tests: stageTests.stage13,
    },
    stage14: {
        stageName: "HTTP Request Module",
        descriptionFilePath: "/description/stage14.md",
        requiresDummyServer: false,
        tests: stageTests.stage14,
    },
    stage15: {
        stageName: "HTTP Response Module",
        descriptionFilePath: "/description/stage15.md",
        requiresDummyServer: false,
        tests: stageTests.stage15,
    },
    stage16: {
        stageName: "HTTP Config Module",
        descriptionFilePath: "/description/stage16.md",
        requiresDummyServer: true,
        tests: stageTests.stage16,
        requiresXpsConfig: true,
    },
    stage17: {
        stageName: "Directory Browsing",
        requiresDummyServer: false,
        customPublicPath: 'stage17',
        descriptionFilePath: "/description/stage17.md",
        tests: stageTests.stage17,
        requiresXpsConfig: true,
    }
}