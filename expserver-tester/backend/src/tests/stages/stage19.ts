
import { HttpRequestTest, Test } from "../../types";
import { buildHttpResponse } from "../../utils/http";
import { gzipHttpRequestParser, httpRequestParser } from "../http";

const requests: HttpRequestTest[] = [
    {
        title: "Sample file without Accept-Encoding",
        description: "This test ensures the server serves the shared sample file normally when no compression is requested",
        info: "Sends a request to the server requesting for sample.txt without Accept-Encoding",
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
                server: 'eXpServer',
            },
        },
    },
]


const GZIPrequests: HttpRequestTest[] = [
    {
        title: "Sample file gzip",
        description:
            "This test ensures the server serves the shared sample file with GZIP when the client requests compression",
        info:
            "Sends a request to the server requesting for sample.txt with Accept-Encoding: gzip",
        request: (containerName: string) => `GET /sample.txt HTTP/1.1\r
Host: ${containerName}:8001\r
User-Agent: TestClient/1.0\r
Accept: text/plain\r
Accept-Encoding: gzip\r
Connection: close\r
\r
`,
        expectedResponse: {
            statusCode: 200,
            headers: {
                "content-type": "text/plain",
                "content-encoding": "gzip",
                server: "eXpServer",
            },
        },
    },
    
   
];


export const stage19Tests: Omit<Test, "status">[] = [
    ...requests.map((request) => ({
        title: request.title,
        description: request.description,
        testInput: request.info,
        expectedBehavior: buildHttpResponse(request.expectedResponse),

        testFunction: async (...args) => {
            return await httpRequestParser(
                8001,
                request,
                ...args
            );
        },
    })),

    ...GZIPrequests.map((request) => ({
        title: request.title,
        description: request.description,
        testInput: request.info,
        expectedBehavior: buildHttpResponse(request.expectedResponse),

        testFunction: async (...args) => {
            return await gzipHttpRequestParser(
                8001,
                request,
                ...args
            );
        },
    })),
];