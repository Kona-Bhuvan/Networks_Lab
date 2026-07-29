import { Test } from "../../types";
import { udpStringReversal, udpMultipleClients, udpErrorHandling } from "../udp";

export const stage3Tests: Omit<Test, 'status'>[] = [
    {
        title: "Single client - input output",
        description: "This test ensures that the server runs as expected when a singular client is connected via UDP",
        testInput: "client sends a randomly generated string to the server over UDP",
        expectedBehavior: "client receives reversed version of the input",
        testFunction: async (...args) => {
            const response = await udpStringReversal(8080, ...args);
            return response;
        },
    },
    {
        title: "Multiple clients to same port - input output",
        description: "This test ensures that the server is able to handle multiple UDP connections at once and verifies the response received by each of the client",
        testInput: "Connect multiple UDP clients to server and sends unique string simultaneously",
        expectedBehavior: "Each of the clients should receive reversed versions of their input",
        testFunction: async (...args) => {
            const response = await udpMultipleClients(8080, true, ...args);
            return response;
        },
    },
    {
        title: "Error handling",
        description: "In the current implementation of the server, there should be no interruption in service when a singular client stops communicating. This test ensures that other clients and new clients are able to send to and receive from the server even after a client has disconnected",
        testInput: "client forcefully disconnects",
        expectedBehavior: "Previous and new clients are able to send and receive output as expected",
        requireRestart: true,
        testFunction: async (...args) => {
            const response = await udpErrorHandling(8080, true, ...args);
            return response;
        },
    }
]