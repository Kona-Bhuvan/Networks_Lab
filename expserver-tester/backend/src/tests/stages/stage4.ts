import { Test } from "../../types";
import { finalErrorHandling } from "../errorhandling";
import { multipleClients } from "../loadtests";
import { stringReversal } from "../string";

export const stage4Tests: Omit<Test, 'status'>[] = [
    {
        title: "Single client - input output",
        description: "This test ensures that the server runs as expected when a singular client is connected",
        testInput: "client sends a randomly generated string to the server",
        expectedBehavior: "client receives reversed version of the input",
        testFunction: async (...args) => {
            const response = await stringReversal(8080, ...args);
            return response;
        },
    },
    {
        title: "Multiple clients to same port - input output",
        description: "This test ensures that the server is able to handle multiple connections at once and verifies the response received by each of the client",
        testInput: "Connect multiple clients to server and sends unique string simultaneously",
        expectedBehavior: "Each of the clients should receive reversed versions of their input",
        testFunction: async (...args) => {
            const response = await multipleClients(8080, true, ...args);
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
            const response = await finalErrorHandling(8080, true, ...args);
            return response;

        },
    }
]