import { Test } from "../../types";
import { proxyMultipleConnections } from "../loadtests";

export const stage5Tests: Omit<Test, 'status'>[] = [
    {
        title: "proxy response checking -- multiple clients",
        description: "creates multiple clients and verifies if the clients receive the responses meant for them, as well as if the response is matching the response received directly from the dummy server",
        testInput: "client 1 sends a GET on /test/1 && client 2 sends a GET on /test/2",
        expectedBehavior: "client 1 receives response from /test/1 && client 2 gets response from /test/2",
        testFunction: async (...args) => {
            const response = await proxyMultipleConnections(8080, ...args);
            return response;
        },

    },
]