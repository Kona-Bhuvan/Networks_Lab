import { Test } from "../../types";
import { httpFileServerTest, httpProxyTest, httpRedirectTest } from "../http";

export const stage16Tests: Omit<Test, 'status'>[] = [
    {
        title: "File server (1)",
        description: "This tests verifies the server abides by the file serving config set by the custom xps_config file",
        testInput: "Sends a request to the server requesting for a .jpg file",
        expectedBehavior: "Server responds with a 200 status code and body containing data of mime-type image/jpg",
        testFunction: async (...args) => {
            const response = await httpFileServerTest('cat.jpg', 'image/jpeg', 8001, ...args);
            return response;
        }
    },
    {
        title: "File server (2)",
        description: "This tests verifies the server abides by the file serving config set by the custom xps_config file",
        testInput: "Sends a request to the server requesting for a .pdf file",
        expectedBehavior: "Server responds with a 200 status code and body containing data of mime-type application/pdf",
        testFunction: async (...args) => {
            const response = await httpFileServerTest('sample.pdf', 'application/pdf', 8001, ...args);
            return response;
        }
    },
    {
        title: "File server (3)",
        description: "This tests verifies the server abides by the file serving config set by the custom xps_config file",
        testInput: "Sends a request to the server requesting for a .txt file",
        expectedBehavior: "Server responds with a 200 status code and body containing data of mime-type text/plain",
        testFunction: async (...args) => {
            const response = await httpFileServerTest('sample.txt', 'text/plain', 8001, ...args);
            return response;
        }
    },
    {
        title: "Redirect (1)",
        description: "This test checks the server's redirect functionality",
        testInput: "Client makes a request to the route http://localhost:8001/redirect",
        expectedBehavior: "Client should receive a response of status 302 and redirect to http://localhost:8002/",
        testFunction: async (...args) => {
            const response = httpRedirectTest('redirect', 'http://localhost:8002/', 8001, ...args);
            return response;
        }
    },
    {
        title: "HTTP Proxy",
        description: "This test checks the server's upstream functionality",
        testInput: "Client makes a request to http://localhost:8002/cat.jpg",
        expectedBehavior: "The response that the client receives should match what is received from http://localhost:3000/cat.jpg",
        testFunction: async (...args) => {
            const response = httpProxyTest('cat.jpg', 8002, 3000, ...args);
            return response;
        }
    },
]