import dgram from "dgram";
import { ContainerManager } from "../core/ContainerManager";
import { TestFunction } from "../types";
import { generateRandomStrings, reverseString } from "../utils/string";

/**
 * UDP string reversal test.
 * Sends random strings over UDP and expects the reversed string back.
 */
export const udpStringReversal: TestFunction = (port: number, spawnInstance: ContainerManager) => {
    return new Promise((resolve, _) => {
        let resolved = false;
        const safeResolve = (value: any) => {
            if (resolved) return;
            resolved = true;
            client.close();
            resolve(value);
        };

        spawnInstance.on('error', (error) => {
            safeResolve({
                passed: false,
                observedBehavior: `server crashed with error ${error}`
            })
        });

        const testStrings = generateRandomStrings(100, 1000);

        const client = dgram.createSocket('udp4');

        client.on('error', (err) => {
            safeResolve({
                passed: false,
                observedBehavior: `UDP socket error: ${err.message}`,
            });
        });

        let currentIndex = 0;

        const sendNext = (index: number) => {
            const input = testStrings[index];
            const message = Buffer.from(input);

            client.send(message, 0, message.length, port, spawnInstance.containerName, (err) => {
                if (err) {
                    return safeResolve({
                        passed: false,
                        observedBehavior: `Failed to send UDP message: ${err.message}`,
                    });
                }
            });
        };

        client.on('message', (msg) => {
            const input = testStrings[currentIndex];
            const expected = reverseString(input);
            const output = msg.toString();

            if (output !== expected) {
                return safeResolve({
                    passed: false,
                    testInput: input,
                    expectedBehavior: expected,
                    observedBehavior: output,
                });
            } else {
                currentIndex++;
                if (currentIndex >= testStrings.length) {
                    return safeResolve({
                        passed: true,
                        testInput: input,
                        expectedBehavior: expected,
                        observedBehavior: output,
                    });
                } else {
                    sendNext(currentIndex);
                }
            }
        });

        // Start sending
        sendNext(0);
    });
};

/**
 * UDP multiple clients test.
 * Connects multiple UDP clients, each sends a unique string, and expects reversed responses.
 */
export const udpMultipleClients: TestFunction = (port: number, reverse: boolean, spawnInstance: ContainerManager) => {
    const numClients = 10;

    return new Promise((resolve, _) => {
        let resolved = false;
        const safeResolve = (value: any) => {
            if (resolved) return;
            resolved = true;
            clients.forEach(c => c.close());
            resolve(value);
        };

        const clients: dgram.Socket[] = [];

        spawnInstance.on('error', (error) => {
            safeResolve({
                passed: false,
                observedBehavior: `server crashed with error ${error}`
            });
        });

        let responsesReceived = 0;

        for (let i = 0; i < numClients; i++) {
            const client = dgram.createSocket('udp4');
            clients.push(client);

            client.on('error', (err) => {
                safeResolve({
                    passed: false,
                    observedBehavior: `UDP client ${i} error: ${err.message}`,
                });
            });

            const input = `string-${i}\n`;

            client.on('message', (msg) => {
                const output = msg.toString();
                const expected = reverse ? reverseString(input) : input;
                responsesReceived++;

                if (output !== expected) {
                    return safeResolve({
                        passed: false,
                        expectedBehavior: `client ${i} receives ${expected}`,
                        observedBehavior: `client ${i} received ${output}`,
                    });
                }

                if (responsesReceived === numClients) {
                    return safeResolve({
                        passed: true,
                    });
                }
            });

            const message = Buffer.from(input);
            client.send(message, 0, message.length, port, spawnInstance.containerName, (err) => {
                if (err) {
                    return safeResolve({
                        passed: false,
                        observedBehavior: `Failed to send from client ${i}: ${err.message}`,
                    });
                }
            });
        }
    });
};

/**
 * UDP error handling test.
 * Ensures that the server continues to function after a client stops communicating.
 * Since UDP is connectionless, "disconnecting" simply means stopping communication.
 * This test verifies that other clients can still send and receive after one client goes silent.
 */
export const udpErrorHandling: TestFunction = (port: number, reverse: boolean, spawnInstance: ContainerManager) => {
    return new Promise((resolve, _) => {
        let resolved = false;
        const safeResolve = (value: any) => {
            if (resolved) return;
            resolved = true;
            resolve(value);
        };

        const safeClose = (socket: dgram.Socket) => {
            try { socket.close(); } catch (_) {}
        };

        spawnInstance.on('close', (code) => {
            return safeResolve({
                passed: false,
                observedBehavior: `Server terminated with Error code ${code || 0}`,
            });
        });

        const existingClient = dgram.createSocket('udp4');
        const clientToBeDisconnected = dgram.createSocket('udp4');
        const newClient = dgram.createSocket('udp4');

        existingClient.on('error', () => {
            safeClose(existingClient); safeClose(clientToBeDisconnected); safeClose(newClient);
            return safeResolve({ passed: false, observedBehavior: "existing client UDP error" });
        });
        clientToBeDisconnected.on('error', () => {
            safeClose(existingClient); safeClose(clientToBeDisconnected); safeClose(newClient);
            return safeResolve({ passed: false, observedBehavior: "disconnected client UDP error" });
        });
        newClient.on('error', () => {
            safeClose(existingClient); safeClose(clientToBeDisconnected); safeClose(newClient);
            return safeResolve({ passed: false, observedBehavior: "new client UDP error" });
        });

        // Step 1: Send a message from clientToBeDisconnected to verify it works
        const disconnectInput = generateRandomStrings(10, 1)[0];
        const disconnectMsg = Buffer.from(disconnectInput);

        clientToBeDisconnected.on('message', () => {
            // Got response, now "disconnect" this client (close it)
            safeClose(clientToBeDisconnected);

            // Step 2: After "disconnect", send from existing client
            const existingInput = generateRandomStrings(10, 1)[0];
            const existingMsg = Buffer.from(existingInput);

            existingClient.on('message', (data) => {
                const output = data.toString();
                const expected = reverse ? reverseString(existingInput) : existingInput;

                if (expected !== output) {
                    safeClose(existingClient); safeClose(newClient);
                    return safeResolve({
                        passed: false,
                        observedBehavior: "existing client didn't receive string it expected",
                    });
                }

                // Step 3: Send from new client
                const newInput = generateRandomStrings(10, 1)[0];
                const newMsg = Buffer.from(newInput);

                newClient.on('message', (data) => {
                    const output = data.toString();
                    const expected = reverse ? reverseString(newInput) : newInput;

                    if (expected !== output) {
                        safeClose(existingClient); safeClose(newClient);
                        return safeResolve({
                            passed: false,
                            observedBehavior: "new client didn't receive string it expected",
                        });
                    }

                    safeClose(existingClient); safeClose(newClient);
                    return safeResolve({
                        passed: true,
                    });
                });

                newClient.send(newMsg, 0, newMsg.length, port, spawnInstance.containerName);
            });

            existingClient.send(existingMsg, 0, existingMsg.length, port, spawnInstance.containerName);
        });

        clientToBeDisconnected.send(disconnectMsg, 0, disconnectMsg.length, port, spawnInstance.containerName);
    });
};
