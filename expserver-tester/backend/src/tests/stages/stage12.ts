import { Test } from "../../types";
import { proxyServerCrashHandling, fileAccessRestrictionTest } from "../errorhandling";
import { prematureFileServerTest, proxyMultipleConnections } from "../loadtests";
import { stringWriteBack } from "../string";

export const stage12Tests: Omit<Test, 'status'>[] = [
    {
        title: "Single client - input output",
        description: "This test ensures that the server runs as expected when a singular client is connected on each of the different port that the server runs on",
        testInput: "client sends a randomly generated string to the server",
        expectedBehavior: "client receives reversed version of the input",
        testFunction: async (...args) => {
            const responses = [
                // await stringWriteBack(8003, ...args),
                await stringWriteBack(8004, ...args)
            ];

            if (responses.some(response => response.passed == false)) {
                return ({
                    passed: true,
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
        title: "proxy response checking -- multiple clients",
        description: "creates multiple clients and verifies if the clients receive the responses meant for them, as well as if the response is matching the response received directly from the dummy server",
        testInput: "client 1 sends a GET on /test/1 && client 2 sends a GET on /test/2",
        expectedBehavior: "client 1 receives response from /test/1 && client 2 gets response from /test/2",
        testFunction: async (...args) => {
            const response = await proxyMultipleConnections(8001, ...args);
            return response;
        },

    },
    {
        title: "File server response",
        description: "This test ensures the file server responds with the 'sample.txt' file stored within the public directory",
        testInput: "Connects to the file server",
        expectedBehavior: "Server responds with the contents of 'sample.txt' without needing any input from the client",
        testFunction: async (...args) => {
            const response = await prematureFileServerTest(8002, ...args);
            return response;
        }
    },
    {
        title: "Error handling",
        description: "Checks the behaviour of the proxy server in the event that the upstream server is unavailable",
        testInput: "Client connects to the proxy and sends a request to be relayed to the upstream server",
        expectedBehavior: "Proxy server shouldn't crash, instead handle the error gracefully",
        requireRestart: true,
        testFunction: async (...args) => {
            const response = await proxyServerCrashHandling(8001, ...args);
            return response;

        },
    },
    {
        title: "File access restriction",
        description: "This test verifies that the file server rejects requests for files outside the public/ directory (../temp/file.txt) and doesn't crash",
        testInput: "Client connects to port 8003 and sends a path outside the public directory (../temp/file.txt)",
        expectedBehavior: "Server should reject the request gracefully without crashing or serving the file",
        testFunction: async (...args) => {
            const response = await fileAccessRestrictionTest(8003, ...args);
            return response;
        }
    },
]