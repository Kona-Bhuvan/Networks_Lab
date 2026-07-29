import { HttpRequestTest, Test } from "../../types";
import { buildHttpResponse } from "../../utils/http";
import { httpRequestParser } from "../http";

const requests: HttpRequestTest[] = [
    {
        title: "Valid request - jpg",
        description: "This test aims to ensure that the requested file is served and verifies that the headers match what is expected",
        info: "Sends a request to the server requesting for a .jpg file",
        request: (containerName: string) => `GET /cat.jpg HTTP/1.1\r
Host: ${containerName}:8001\r
User-Agent: TestClient/1.0\r
Accept: image/jpeg\r
Connection: close\r
\r
`,
        expectedResponse: {
            statusCode: 200,
            headers: {
                'content-type': 'image/jpeg',
                server: 'eXpServer'
            }
        },
    },
    {
        title: "Valid request - pdf",
        description: "This test aims to ensure that the requested file is served and verifies that the headers match what is expected",
        info: "Sends a request to the server requesting for a .pdf file",
        request: (containerName: string) => `GET /sample.pdf HTTP/1.1\r
Host: ${containerName}:8001\r
User-Agent: TestClient/1.0\r
Accept: application/pdf\r
Connection: close\r
\r
`,
        expectedResponse: {
            statusCode: 200,
            headers: {
                'content-type': 'application/pdf',
                server: 'eXpServer'
            }
        },
    },
    {
        title: "Valid request - plain",
        description: "This test aims to ensure that the requested file is served and verifies that the headers match what is expected",
        info: "Sends a request to the server requesting for a .txt file",
        request: (containerName: string) => `GET /sample.txt HTTP/1.1\r
Host: ${containerName}:8001\r
User-Agent: TestClient/1.0\r
Accept: text/plain\r
Connection: close\r
\r
`,
        expectedResponse: {
            statusCode: 200,
            headers: {
                'content-type': 'text/plain',
                server: 'eXpServer'
            }
        },
    },
    {
        title: "File not found",
        description: "This test aims to ensure the error handling in case the user requests for a file that isn't found within the public directory",
        info: "Sends a request to the server request for a file that doesn't exist",
        request: (containerName: string) => `GET /test.html HTTP/1.1\r
Host: ${containerName}:8001\r
User-Agent: TestClient/1.0\r
Accept: text/html\r
Connection: close\r
\r
`,
        expectedResponse: {
            statusCode: 404,
            headers: {
                server: 'eXpServer',
            }
        }
    },
    {
        title: "Missing HTTP Version",
        description: "This test aims to ensure proper error handling of the server in case of an invalid HTTP request",
        info: "Sends a request to the server without specifying HTTP version",
        request: (containerName: string) => `GET /index.html\r
Host: ${containerName}:8001\r
\r
`,
        expectedResponse: {
            statusCode: 400,
            headers: {
                server: "eXpServer",
            },
        },
    },
    {
        title: "Invalid HTTP method",
        description: "This test aims to ensure proper error handling of the server in case of an invalid HTTP request",
        info: "Sends a request to the server with an invalid HTTP method",
        request: (containerName: string) => `GOT /index.html HTTP/1.1\r
Host: ${containerName}:8001\r
\r
`,
        expectedResponse: {
            statusCode: 400,
            headers: {
                server: "eXpServer",
            },
        },
    },
    {
        title: "Missing host header",
        description: "This test aims to ensure proper error handling of the server in case of an invalid HTTP request",
        info: "Sends a request to the server without specifying the host (mandatory header field)",
        request: (containerName: string) => `GET /index.html HTTP/1.1\r
\r
`,
        expectedResponse: {
            statusCode: 400,
            headers: {
                server: "eXpServer",
            },
        },
    },
    {
        title: "Invalid HTTP Version",
        description: "This test aims to ensure proper error handling of the server in case of an invalid HTTP request",
        info: "Sends a request to the server with a non-existent HTTP Version",
        request: (containerName: string) => `GET /index.html HTTX/2.0\r
Host: ${containerName}:8001\r
\r
`,
        expectedResponse: {
            statusCode: 400,
            headers: {
                server: "eXpServer",
            },
        },
    },
    {
        title: "Improperly formatted request (headers)",
        description: "This test aims to ensure proper error handling of the server in case of an invalid HTTP request",
        info: "Sends a request to the server without colon separation between the key-value pairs in the headers",
        request: (containerName: string) => `GET /index.html HTTP/1.1\r
Host ${containerName}:8001\r
\r
`,
        expectedResponse: {
            statusCode: 400,
            headers: {
                server: "eXpServer",
            },
        },
    },
]


export const stage14Tests: Omit<Test, 'status'>[] = requests.map(request => ({
    title: request.title,
    description: request.description,
    testInput: request.info,
    expectedBehavior: buildHttpResponse(request.expectedResponse),
    testFunction: async (...args) => {
        const response = await httpRequestParser(8001, request, ...args);
        return response;
    }
}))