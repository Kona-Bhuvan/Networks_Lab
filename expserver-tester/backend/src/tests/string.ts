import { Socket } from "net";
import { LOCALHOST } from "../constants";
import { TestFunction } from "../types";
import { generateRandomStrings, reverseString } from "../utils/string";
import { ContainerManager } from "../core/ContainerManager";

export const stringReversal: TestFunction = (port: number, spawnInstance: ContainerManager) => {
    return new Promise((resolve, _) => {
        let resolved = false;
        const safeResolve = (value: any) => {
            if (resolved) return;
            resolved = true;
            resolve(value);
        };

        spawnInstance.on('error', (error) => {
            safeResolve({
                passed: false,
                observedBehavior: `server crashed with error ${error}`
            })
        });

        const testStrings = generateRandomStrings(100, 1000);

        const client = new Socket();

        const safeCleanup = () => {
            client.removeAllListeners();
            // Always keep a no-op error handler to prevent unhandled error crashes
            client.on('error', () => { });
            client.destroy();
        };

        client.on('connectionAttemptFailed', () => {
            safeCleanup();
            return safeResolve({
                passed: false,
                observedBehavior: "server refused connection",
            })
        })

        client.on('connectionAttemptTimeout', () => {
            safeCleanup();
            return safeResolve({
                passed: false,
                observedBehavior: "server connection timed out",
            })
        })

        client.on('close', () => {
            safeCleanup();
            return safeResolve({
                passed: false,
                observedBehavior: "server connection timed out",
            })
        })

        client.on('error', (e) => {
            safeCleanup();
            return safeResolve({
                passed: false,
                observedBehavior: "Cannot establish a connection with server",
            })
        })

        const writeToServer = (index: number) => {
            const input = testStrings[index];

            const verifyResultCallback = (data: Buffer) => {

                client.off('data', verifyResultCallback);
                const expected = reverseString(input);
                const output = data.toString();

                if (output !== expected) {
                    safeCleanup();
                    return safeResolve({
                        passed: false,
                        testInput: input,
                        expectedBehavior: expected,
                        observedBehavior: output,
                    })
                }
                else {
                    if (index == testStrings.length - 1) {
                        safeCleanup();
                        return safeResolve({
                            passed: true,
                            testInput: input,
                            expectedBehavior: expected,
                            observedBehavior: output,
                        })
                    }
                    else {
                        return writeToServer(index + 1);
                    }
                }

            }


            client.on('data', verifyResultCallback);
            client.write(input);
        }

        client.connect(port, spawnInstance.containerName, () => writeToServer(0));
    })
}

export const stringWriteBack: TestFunction = (port: number, spawnInstance: ContainerManager) => {
    return new Promise((resolve, _) => {
        let resolved = false;
        const safeResolve = (value: any) => {
            if (resolved) return;
            resolved = true;
            resolve(value);
        };

        spawnInstance.on('error', (error) => {
            safeResolve({
                passed: false,
                observedBehavior: `server crashed with error ${error}`
            })
        });

        const testStrings = generateRandomStrings(100, 1000);

        const client = new Socket();

        const safeCleanup = () => {
            client.removeAllListeners();
            // Always keep a no-op error handler to prevent unhandled error crashes
            client.on('error', () => { });
            client.destroy();
        };

        client.on('connectionAttemptFailed', () => {
            safeCleanup();
            return safeResolve({
                passed: false,
                observedBehavior: "server refused connection",
            })
        })

        client.on('connectionAttemptTimeout', () => {
            safeCleanup();
            return safeResolve({
                passed: false,
                observedBehavior: "server connection timed out",
            })
        })

        client.on('error', () => {
            safeCleanup();
            return safeResolve({
                passed: false,
                observedBehavior: "Cannot establish a connection with server",
            })
        })

        client.on('close', () => {
            safeCleanup();
            return safeResolve({
                passed: false,
                observedBehavior: "Connection terminated / server not running on desired port",
            })
        })


        const writeToServer = (index: number) => {
            const input = testStrings[index];

            const verifyResultCallback = (data: Buffer) => {

                client.off('data', verifyResultCallback);
                const expected = input;
                const output = data.toString();

                if (output !== expected) {
                    safeCleanup();
                    return safeResolve({
                        passed: false,
                        testInput: input,
                        expectedBehavior: expected,
                        observedBehavior: output,
                    })
                }
                else {
                    if (index == testStrings.length - 1) {
                        safeCleanup();
                        return safeResolve({
                            passed: true,
                            testInput: input,
                            expectedBehavior: expected,
                            observedBehavior: output,
                        })
                    }
                    else {
                        return writeToServer(index + 1);
                    }
                }

            }


            client.on('data', verifyResultCallback);
            client.write(input);
        }

        client.connect(port, spawnInstance.containerName, () => writeToServer(0));

    })
}