import { Socket } from "net";
import { ContainerManager } from "../core/ContainerManager";
import { TestFunction } from "../types";
import { generateRandomStrings, reverseString } from "../utils/string";

export const prematureErrorHandling: TestFunction = (port: number, spawnInstance: ContainerManager) => {
    return new Promise((resolve, _) => {
        let resolved = false;
        const safeResolve = (value: any) => {
            if (resolved) return;
            resolved = true;
            resolve(value);
        };

        const client = new Socket();

        const safeCleanup = () => {
            client.removeAllListeners();
            client.on('error', () => { });
            client.destroy();
        };


        const closeCallback = (code: number | null) => {
            safeCleanup();
            safeResolve({
                passed: (code == 1),
                observedBehavior: `Process exited with code ${code || 0}`,
            })
        }

        spawnInstance.on('close', closeCallback);

        client.on('error', (error) => {
            console.log(error);
            safeResolve({
                passed: false,
                observedBehavior: "Client disconnected with an error",
                cleanup: () => spawnInstance.off('close', closeCallback),
            })
        });


        client.connect(port, spawnInstance.containerName, () => {
            client.destroy();

            client.on('close', () => {
                const timeout = setTimeout(() => {
                    spawnInstance.off('close', closeCallback);
                    safeResolve({
                        passed: false,
                        observedBehavior: "Process did not exit within 3s",
                        cleanup: () => clearTimeout(timeout),
                    })
                }, 3000);
            })
        });
    })
}

export const finalErrorHandling: TestFunction = (port: number, reverse: boolean, spawnInstance: ContainerManager) => {

    return new Promise((resolve, _) => {
        let resolved = false;
        const safeResolve = (value: any) => {
            if (resolved) return;
            resolved = true;
            resolve(value);
        };

        const existingClient = new Socket();
        const clientToBeDisconnected = new Socket();
        const newClient = new Socket();

        const safeCleanupAll = () => {
            [existingClient, clientToBeDisconnected, newClient].forEach(client => {
                client.removeAllListeners();
                client.on('error', () => { });
                client.destroy();
            });
        };


        const connectionAttemptFailedCallback = () => {
            safeCleanupAll();
            return safeResolve({
                passed: false,
                observedBehavior: "server refused connection",
            })
        }

        const connectionTimeoutCallback = () => {
            safeCleanupAll();
            return safeResolve({
                passed: false,
                observedBehavior: "server connection timed out",
            })
        }

        const connectionErrorCallback = () => {
            safeCleanupAll();
            return safeResolve({
                passed: false,
                observedBehavior: "cannot establish a connection with server",
            })
        }

        const clientCloseCallback = () => {
            safeCleanupAll();
            return safeResolve({
                passed: false,
                observedBehavior: "Connection was terminated / server is not running on desired port",
            })
        }


        existingClient.on('connectionAttemptTimeout', connectionTimeoutCallback);
        clientToBeDisconnected.on('connectionAttemptTimeout', connectionTimeoutCallback);
        newClient.on('connectionAttemptTimeout', connectionTimeoutCallback);

        existingClient.on('connectionAttemptFailed', connectionAttemptFailedCallback);
        clientToBeDisconnected.on('connectionAttemptFailed', connectionAttemptFailedCallback);
        newClient.on('connectionAttemptFailed', connectionAttemptFailedCallback);

        existingClient.on('error', connectionErrorCallback);
        clientToBeDisconnected.on('error', connectionErrorCallback);
        newClient.on('error', connectionErrorCallback);

        spawnInstance.on('close', (code) => {
            safeCleanupAll();
            return safeResolve({
                passed: false,
                observedBehavior: `Server terminated with Error code ${code || 0}`,
            })

        })

        const createNewClient = () => {
            newClient.connect(port, spawnInstance.containerName, () => {
                const input = generateRandomStrings(10, 1)[0];
                newClient.once('data', (data) => {
                    const output = data.toString();
                    const expected = (reverse
                        ? reverseString(input)
                        : input);

                    if (expected !== output) {
                        safeCleanupAll();
                        return safeResolve({
                            passed: false,
                            observedBehavior: "new client didn't receive string it expected",
                        })
                    }
                    else {
                        safeCleanupAll();
                        return safeResolve({
                            passed: true,
                        })
                    }
                })

                newClient.write(input);
            })
        }

        clientToBeDisconnected.once('close', () => {
            const input = generateRandomStrings(10, 1)[0];
            existingClient.on('data', (data) => {
                const output = data.toString();
                const expected = (reverse
                    ? reverseString(input)
                    : input);

                if (expected !== output) {
                    safeCleanupAll();
                    return safeResolve({
                        passed: false,
                        observedBehavior: "existing client didn't receive string it expected",
                    })
                }
                else
                    createNewClient();
            })

            existingClient.write(input);
        })

        clientToBeDisconnected.connect(port, spawnInstance.containerName, () => {
            existingClient.connect(port, spawnInstance.containerName, () => {
                clientToBeDisconnected.destroy();
            })
        })

    })
}

export const proxyServerCrashHandling: TestFunction = async (port: number, spawnInstance: ContainerManager) => {
    await spawnInstance.stopPythonServer();
    return new Promise((resolve, _) => {
        let resolved = false;
        const safeResolve = (value: any) => {
            if (resolved) return;
            resolved = true;
            resolve(value);
        };

        spawnInstance.on('close', (code) => {
            return safeResolve({
                passed: false,
                observedBehavior: `Server terminated with Error code ${code}`,
            })
        })

        fetch(`http://${spawnInstance.containerName}:${port}`).catch(err => {
            const causeCode = err.cause?.code;
            if (causeCode === 'UND_ERR_SOCKET' || causeCode === 'ECONNRESET') {
                return safeResolve({
                    passed: true,
                    observedBehavior: `Server terminated client connection safely (${causeCode})`,
                })
            }
            else {
                const errorDetail = `Message: ${err.message}, Code: ${err.code}, Cause: ${err.cause?.code || 'none'}`;
                return safeResolve({
                    passed: false,
                    observedBehavior: `Server terminated client with error: ${errorDetail}`
                })
            }
        })
    });
}

export const fileAccessRestrictionTest: TestFunction = async (port: number, spawnInstance: ContainerManager) => {
    // Create a file outside public/ inside the container so realpath() can resolve it
    const container = spawnInstance.container;
    const exec = await container.exec({
        AttachStderr: false,
        AttachStdout: false,
        Tty: false,
        AttachStdin: false,
        Cmd: ['sh', '-c', 'mkdir -p /usr/src/temp && echo "Some sample data" > /usr/src/temp/file.txt && chmod o+r /usr/src/temp/file.txt']
    });
    await exec.start({ hijack: false, stdin: false });

    // Small delay to ensure the file is created
    await new Promise(r => setTimeout(r, 500));

    return new Promise((resolve) => {
        let resolved = false;
        const safeResolve = (value: any) => {
            if (resolved) return;
            resolved = true;
            resolve(value);
        };

        const client = new Socket();

        const safeCleanup = () => {
            client.removeAllListeners();
            client.on('error', () => { });
            client.destroy();
        };

        // FAIL: Server crashed
        spawnInstance.once('error', (error) => {
            safeCleanup();
            return safeResolve({
                passed: false,
                observedBehavior: `Server crashed with error: ${error}`,
            });
        });

        // FAIL: Server process terminated
        spawnInstance.once('close', (code) => {
            safeCleanup();
            return safeResolve({
                passed: false,
                observedBehavior: `Server terminated with exit code ${code || 0}`,
            });
        });

        // FAIL: Cannot connect
        client.on('connectionAttemptFailed', () => {
            safeCleanup();
            return safeResolve({
                passed: false,
                observedBehavior: "Server refused connection",
            });
        });

        // FAIL: Connection timed out
        client.on('connectionAttemptTimeout', () => {
            safeCleanup();
            return safeResolve({
                passed: false,
                observedBehavior: "Server connection timed out",
            });
        });

        // FAIL: Connection error
        client.on('error', () => {
            safeCleanup();
            return safeResolve({
                passed: false,
                observedBehavior: "Cannot establish a connection with server",
            });
        });

        // FAIL: If server sends data, the restriction didn't work
        client.on('data', (data) => {
            safeCleanup();
            return safeResolve({
                passed: false,
                observedBehavior: `Server served data when it should have rejected the request.`,
            });
        });

        // PASS: Server closed connection without sending data — graceful rejection
        client.on('close', () => {
            safeCleanup();
            return safeResolve({
                passed: true,
                observedBehavior: "Server closed the connection without serving the restricted file",
            });
        });

        // Just connect — no data is sent. The server is preconfigured to try
        // serving a file outside public/, so the restriction should kick in.
        client.connect(port, spawnInstance.containerName);
    });
};