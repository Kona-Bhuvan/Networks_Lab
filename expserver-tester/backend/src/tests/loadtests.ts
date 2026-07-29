import { Socket } from "net";
import { ContainerManager } from "../core/ContainerManager";
import { TestFunction } from "../types";
import { reverseString } from "../utils/string";
import path from "path";
import { createReadStream, readFileSync } from 'fs'
import { bestFitLine } from "../utils/line";


export const multipleClients: TestFunction = (port: number, reverse: boolean, spawnInstance: ContainerManager) => {
    const numClients = 10;


    return new Promise((resolve, _) => {
        let resolved = false;
        const safeResolve = (value: any) => {
            if (resolved) return;
            resolved = true;
            resolve(value);
        };

        const clients: Socket[] = [];

        const safeCleanupAll = () => {
            clients.forEach(client => {
                client.removeAllListeners();
                client.on('error', () => { });
                client.destroy();
            });
        };

        for (let i = 0; i < numClients; i++) {
            const newClient = new Socket();
            newClient.on('connectionAttemptFailed', () => {
                safeCleanupAll();
                return safeResolve({
                    passed: false,
                    observedBehavior: "Server refused connection",
                })
            })

            newClient.on('connectionAttemptTimeout', () => {
                safeCleanupAll();
                return safeResolve({
                    passed: false,
                    observedBehavior: "Server connection timed out",
                })
            })

            newClient.on('error', () => {
                safeCleanupAll();
                return safeResolve({
                    passed: false,
                    observedBehavior: "cannot establish a connection with server",
                })
            })


            clients.push(newClient);
        }

        let responsesReceived: number = 0;

        spawnInstance.on('error', (error) => {
            safeCleanupAll();
            safeResolve({
                passed: false,
                observedBehavior: `server crashed with error ${error}`
            })
        });


        const clientRecvChecker = (client: Socket, index: number) => {
            const input = `string-${index}\n`;

            const receivedCallback = (data: Buffer) => {
                const output = data.toString();
                const expected = (reverse
                    ? reverseString(input)
                    : input);
                responsesReceived++;

                if (output !== expected) {
                    safeCleanupAll();
                    return safeResolve({
                        passed: false,
                        expectedBehavior: `client ${index} receives ${expected}`,
                        observedBehavior: `client ${index} received ${output}`,
                    })
                }
                client.off('data', receivedCallback);


                if (responsesReceived == numClients) {
                    safeCleanupAll();
                    return safeResolve({
                        passed: true,
                    })
                }
            }

            client.on('data', receivedCallback);
            client.write(input);
        }

        clients.forEach((client, index) => {
            client.connect(port, spawnInstance.containerName, () => {
                clientRecvChecker(client, index);
            })
        })

    })
}

export const proxyMultipleConnections: TestFunction = (port: number, spawnInstance: ContainerManager) => {
    const serverPort = 3000;
    const numClients = 3;
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
                observedBehavior: `Server crashed with error ${error}`
            })
        })

        let numPassed = 0;
        const verifyResponse = async (proxyServerResponse: string, route: number) => {
            const uri = `http://${spawnInstance.containerName}:${serverPort}/${route}`;
            const serverResponse = await fetch(uri);
            const statusLine = `HTTP/1.1 ${serverResponse.status} ${serverResponse.statusText}`;

            const headers = [...serverResponse.headers.entries()]
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n')

            const body = await serverResponse.text();
            const fullResponse = `${statusLine}\n${headers}\n\n${body}`;

            if (fullResponse !== proxyServerResponse) {
                return safeResolve({
                    passed: false,
                    observedBehavior: "Response received from the proxy server didn't match the response received directly from the main server",
                })
            }
            else {
                numPassed++;
                if (numPassed == numClients) {
                    return safeResolve({
                        passed: true,
                    })
                }
            }
        }

        for (let i = 0; i < numClients; i++) {
            fetch(`http://${spawnInstance.containerName}:${port}/${i}`)
                .then(res => {

                    const statusLine = `HTTP/1.1 ${res.status} ${res.statusText}`;

                    const headers = [...res.headers.entries()]
                        .map(([key, value]) => `${key}: ${value}`)
                        .join('\n')

                    res.text().then(body => {
                        const fullResponse = `${statusLine}\n${headers}\n\n${body}`;
                        verifyResponse(fullResponse, i);
                    })
                })
                .catch(error => {
                    return safeResolve({
                        passed: false,
                        observedBehavior: `Connection failed with error ${error}`
                    })
                })
        }
    })
}


/**
 * creates a tcp connection to the tcp server running on the given port
 * sends a 4gb file to the server, but does not receive anything to check if the server is non-blocking
 * waits for 5 seconds, then creates a second connection
 * @param port number
 */
export const nonBlockingSocket: TestFunction = async (port: number, spawnInstance: ContainerManager) => {
    return new Promise((resolve, _) => {
        let resolved = false;
        const safeResolve = (value: any) => {
            if (resolved) return;
            resolved = true;
            resolve(value);
        };

        const firstClient = new Socket();
        const secondClient = new Socket();

        const safeCleanupAll = () => {
            firstClient.removeAllListeners();
            firstClient.on('error', () => { });
            firstClient.destroy();
            secondClient.removeAllListeners();
            secondClient.on('error', () => { });
            secondClient.destroy();
        };

        spawnInstance.on('error', error => {
            safeCleanupAll();
            return safeResolve({
                passed: false,
                observedBehavior: `Server crashed with error ${error}`,
            })
        })


        const connectionFailedHandler = () => {
            safeCleanupAll();
            return safeResolve({
                passed: false,
                observedBehavior: "Server refused connection",
            })
        };

        const connectionTimeoutHandler = () => {
            safeCleanupAll();
            return safeResolve({
                passed: false,
                observedBehavior: "Server connection timeout",
            })
        }

        const connectionErrorHandler = () => {
            safeCleanupAll();
            return safeResolve({
                passed: false,
                observedBehavior: "Cannot establish connection to server",
            })
        }


        firstClient.on('connectionAttemptFailed', connectionFailedHandler);
        firstClient.on('connectionAttemptTimeout', connectionTimeoutHandler);
        firstClient.on('error', connectionErrorHandler);

        secondClient.on('connectionAttemptFailed', connectionFailedHandler);
        secondClient.on('connectionAttemptTimeout', connectionTimeoutHandler);
        secondClient.on('error', connectionErrorHandler);

        firstClient.connect(port, spawnInstance.containerName, () => {
            const file = createReadStream(path.join(process.cwd(), 'public', 'large-files', '4gb.txt'));
            file.pipe(firstClient);

            const firstClientWaitTimeout = setTimeout(() => {
                secondClient.connect(port, spawnInstance.containerName, () => {
                    const errorCallback = () => {
                        ;
                        clearTimeout(firstClientWaitTimeout);
                        clearTimeout(secondClientWaitTimeout);
                        safeCleanupAll();

                        return safeResolve({
                            passed: false,
                            observedBehavior: "Client connection was disconnected",
                        })
                    };

                    firstClient.on('error', errorCallback);
                    secondClient.on('error', errorCallback)



                    const input = "hello world\n";
                    secondClient.write(input);

                    secondClient.on('data', () => {
                        clearTimeout(secondClientWaitTimeout);
                        clearTimeout(firstClientWaitTimeout)
                        safeCleanupAll();

                        return safeResolve({
                            passed: true,
                        })
                    })

                    const secondClientWaitTimeout = setTimeout(() => {
                        clearTimeout(secondClientWaitTimeout);
                        file.close();
                        clearTimeout(firstClientWaitTimeout);
                        safeCleanupAll();
                        spawnInstance.kill().then(() => {
                            return safeResolve({
                                passed: false,
                                observedBehavior: "Server did not respond to the second client within 30s",
                            });
                        })


                    }, 5000);
                })
            }, 5000);

        })
    })
}

export const checkCpuUsage: TestFunction = (port: number, spawnInstance: ContainerManager) => {
    return new Promise((resolve, _) => {
        let resolved = false;
        const safeResolve = (value: any) => {
            if (resolved) return;
            resolved = true;
            resolve(value);
        };

        const NUM_ITERATIONS = 30;
        const client = new Socket();

        const safeCleanup = () => {
            client.removeAllListeners();
            client.on('error', () => { });
            client.destroy();
        };

        spawnInstance.on('error', error => {
            safeCleanup();
            return safeResolve({
                passed: false,
                observedBehavior: `Server crashed with error ${error}`
            })
        })

        const calcBestFitSlope = (results: number[]) => {
            const line = bestFitLine(results);
            if (line == null)
                return 0;

            const { slope } = line;
            console.log(slope);
            return slope;
        }

        const calcAvergeUsage = (results: number[]) => {
            let total = 0;
            for (let i = 0; i < results.length; i++) {
                total += results[i];
            }
            const average = total / results.length;
            return average;
        }

        client.on('connectionAttemptFailed', () => {
            safeCleanup();
            return safeResolve({
                passed: false,
                observedBehavior: "Server refused connection",
            })
        });

        client.on('connectionAttemptTimeout', () => {
            safeCleanup();
            return safeResolve({
                passed: false,
                observedBehavior: "Server connection timed out",
            })
        })

        client.on('error', () => {
            safeCleanup();
            return safeResolve({
                passed: false,
                observedBehavior: "Cannot establish a connection with server",
            })
        })

        client.connect(port, spawnInstance.containerName, () => {
            const results = Array<number>(NUM_ITERATIONS);
            let index = NUM_ITERATIONS - 1;


            const interval = setInterval(async () => {
                if (index < 0) {
                    const average = calcAvergeUsage(results);
                    const slope = calcBestFitSlope(results);
                    const observedBehavior = `CPU usage was ${average}%`;
                    safeCleanup();
                    clearInterval(interval);
                    if (slope > 0.5) {
                        return safeResolve({
                            passed: false,
                            observedBehavior: `Observed a trend of CPU usage increasing at a higher pace than expected. The average memory usage was ${average}%`,
                        });
                    }
                    else {
                        return safeResolve({
                            passed: true,
                            observedBehavior: `The average CPU usage was ${average}%`,
                        })
                    }
                }
                try {
                    const { cpuUsage } = await spawnInstance.getResourceStats();
                    results[NUM_ITERATIONS - index - 1] = cpuUsage;
                    index--;
                }
                catch {
                    results[NUM_ITERATIONS - index - 1] = Infinity;
                    index--;
                }
            }, 1000);
        })
    });
}

export const checkMemUsage: TestFunction = (spawnInstance: ContainerManager) => {
    return new Promise(async resolve => {
        let resolved = false;
        const safeResolve = (value: any) => {
            if (resolved) return;
            resolved = true;
            resolve(value);
        };

        await spawnInstance.detachStream();
        const results: number[] = [];
        spawnInstance.on('error', error => {
            safeResolve({
                passed: false,
                observedBehavior: `Server crashed with error ${error}`
            })
        });

        const calcBestFitSlope = (results: number[]) => {
            const line = bestFitLine(results);
            if (line == null)
                return 0;

            const { slope } = line;
            return slope;
        }

        const calcAverageUsage = (results: number[]) => {
            if (results.length == 0)
                return 0;
            let total = 0;
            for (let i = 0; i < results.length; i++)
                total += results[i]
            const average = total / results.length;
            return average;
        }

        const container = spawnInstance.container;
        const exec = await container.exec({
            AttachStderr: false,
            AttachStdout: false,
            Tty: false,
            AttachStdin: false,
            Cmd: ['sh', '-c', 'cat /usr/src/public/4gb.txt | netcat -q 0 localhost 8001']
        });


        await exec.start({ hijack: false, stdin: false });

        const interval = setInterval(() => {
            spawnInstance.getResourceStats()
                .then(({ memUsage }) => {
                    results.push(memUsage);
                })
                .catch(() => {
                    console.log("[Fetching resource stats]: Container already terminated...")
                })
        }, 1000);

        try {
            const exitCode = await new Promise((resolve, reject) => {
                const checkExec = () => {
                    exec.inspect((err, data) => {
                        if (err)
                            return reject(err);
                        if (data.Running)
                            return setTimeout(checkExec, 500);
                        else
                            return resolve(data.ExitCode);
                    })
                }

                checkExec();
            })


            if (exitCode != 0) {
                clearInterval(interval);
                await spawnInstance.attachStream();
                return safeResolve({
                    passed: false,
                    observedBehavior: `netcat localhost 8001 failed with exit code ${exitCode}`
                })
            }
            const slope = calcBestFitSlope(results);
            const average = calcAverageUsage(results);
            clearInterval(interval);
            if (slope > 0.5) {
                await spawnInstance.attachStream();
                return safeResolve({
                    passed: false,
                    observedBehavior: `Observed a trend of memory usage increasing at a higher pace than expected. The average memory usage was ${average}%`
                })
            }
            else {
                await spawnInstance.attachStream();
                return safeResolve({
                    passed: true,
                    observedBehavior: `The average memory usage was ${average}%`
                })
            }
        }
        catch {
            clearInterval(interval);
            await spawnInstance.attachStream();
            return safeResolve({
                passed: false,
                observedBehavior: "something went wrong",
            })
        }
    })
}

export const prematureFileServerTest: TestFunction = (port: number, spawnInstance: ContainerManager) => {
    return new Promise((resolve) => {
        let resolved = false;
        const safeResolve = (value: any) => {
            if (resolved) return;
            resolved = true;
            resolve(value);
        };

        spawnInstance.once('error', (error) => {
            return safeResolve({
                passed: false,
                observedBehavior: `server crashed with error ${error}`
            })
        })

        const client = new Socket();

        const safeCleanup = () => {
            client.removeAllListeners();
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

        let timeout = null;
        client.on('connect', () => {
            timeout = setTimeout(() => {
                safeCleanup();
                return safeResolve({
                    passed: false,
                    observedBehavior: "Server didn't respond with any data",
                })
            }, 30000);
        })



        const verifyResultCallback = (data: Buffer) => {
            if (timeout !== null)
                clearTimeout(timeout);
            const expectedString = readFileSync(`${process.cwd()}/public/common/sample.txt`, { encoding: 'utf-8' });
            if (data.toString() == expectedString) {
                safeCleanup();
                return safeResolve({
                    passed: true,
                });
            }
            else {
                safeCleanup();
                return safeResolve({
                    passed: false,
                    observedBehavior: `Expected string: ${data.toString()}, received ${expectedString}`
                })
            }
        }

        client.on('data', verifyResultCallback);
        client.connect(port, spawnInstance.containerName);
    });
}
