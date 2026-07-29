import { Test } from "../../types";
import { finalErrorHandling } from "../errorhandling";
import { multipleClients, nonBlockingSocket } from "../loadtests";
import { stringReversal } from "../string";

export const stage8Tests: Omit<Test, 'status'>[] = [
    {
        title: "Non-blocking server",
        description: "creates a tcp connection to the tcp server running on the given port sends a 4gb file to the server, but does not receive anything to check if the server is non-blocking waits for 5 seconds, then creates a second connection",
        testInput: "a client is connected to the server and sends a large file, but does not receive any data from the server. After 30 seconds, a second client is connected to the server, and verifies if the server responds",
        expectedBehavior: "the second connection is able to send and receive data from the server",
        testFunction: async (...args) => {
            const response = await nonBlockingSocket(8001, ...args);
            return response;
        },
    },
    {
        title: "Single client - input output",
        description: "This test ensures that the server runs as expected when a singular client is connected on each of the different port that the server runs on",
        testInput: "client sends a randomly generated string to the server",
        expectedBehavior: "client receives reversed version of the input",
        testFunction: async (...args) => {
            const responses = [
                await stringReversal(8001, ...args),
                await stringReversal(8002, ...args),
                await stringReversal(8003, ...args),
                await stringReversal(8004, ...args)
            ];

            if (responses.some(response => response.passed == false)) {
                return ({
                    passed: false,
                    testInput: responses[0].testInput,
                    expectedBehavior: responses[0].expectedBehavior,
                    observedBehavior: "Server didn't work as expected on all ports",
                })
            }
            else {
                return ({
                    passed: true,
                    testInput: responses[0].testInput,
                    expectedBehavior: responses[0].expectedBehavior,
                    observedBehavior: responses[0].expectedBehavior,
                })
            }
        },
    },
    {
        title: "Multiple clients to same port - input output",
        description: "This test ensures that the server is able to handle multiple connections at once and verifies the response received by each of the client",
        testInput: "Connect multiple clients to server and sent string simultaneously",
        expectedBehavior: "Each of the clients should receive the reversed versions of the string that they sent",
        testFunction: async (...args) => {
            const response = await multipleClients(8001, true, ...args);
            return response;
        },
    },
    {
        title: "Error handling",
        description: "In the current implementation of the server, there should be no inturruption in service when a singular client disconnects. This test ensures that previously connected clients, as well as new clients are able to connect, send to and receive from the server even after a client has diconnected",
        testInput: "client forcefully disconnects",
        expectedBehavior: "Previous and new clients are able to send and receive output as expected",
        requireRestart: true,
        testFunction: async (...args) => {
            const response = await finalErrorHandling(8001, true, ...args);
            return response;

        },
    },
]