import { Test } from "../../types";
import { prematureErrorHandling } from "../errorhandling";
import { stringReversal } from "../string";

export const stage1Tests: Omit<Test, 'status'>[] = [
    {
        title: "String reversal",
        description: "Ensures proper working of the server by verifying if the string returned by the server matches the expected output",
        testInput: "client sends a randomly generated string to the server",
        expectedBehavior: "client receives reversed version of the input",
        testFunction: async (...args: any[]) => {
            const response = await stringReversal(8080, ...args)
            return response;
        },
    },
    {
        title: "Checking error handling",
        description: "Checks how the server behaves when the client unexpectedly disconnects. In the current version of the server, we are not implementing proper handling of such a situation and thus the server should terminate with error code 1",
        testInput: "Force disconnection of the client",
        expectedBehavior: "Process exited with code 1",
        requireRestart: true,
        testFunction: async (...args: any[]) => {
            const response = await prematureErrorHandling(8080, ...args);
            return response;
        },
    },
]