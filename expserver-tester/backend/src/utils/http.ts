import { HTTPParser } from "http-parser-js"
import { HttpResponse } from "../types";
import { STATUS_CODES } from "http";


export const parseHttpResponse = (responseString: string) => {
    const parser = new HTTPParser(HTTPParser.RESPONSE);

    const parsedResponse: HttpResponse = { statusCode: -1, headers: {} }

    parser[HTTPParser.kOnHeadersComplete] = (info: any) => {
        parsedResponse.statusCode = info.statusCode;
        parsedResponse.headers = info.headers.reduce((acc: any, val: any, index: any, array: any[]) => {
            if (index % 2 == 0)
                acc[val.toLowerCase()] = array[index + 1];
            return acc;
        }, {})
    }

    parser[HTTPParser.kOnBody] = (body: Buffer, start: number, len: number) => {
        parsedResponse.body = body.toString("utf-8", start, start + len);
    };

    parser.execute(Buffer.from(responseString));
    return parsedResponse
}

export const capitalizeHeader = (header: string) => {
    return header
        .split("-")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join("-");
}

export const buildHttpResponse = (parsedResponse: HttpResponse) => {
    const statusMessage = STATUS_CODES[parsedResponse.statusCode] || "Unknown ctatus code"
    const statusLine = `HTTP/1.1 ${parsedResponse.statusCode}} ${statusMessage}`;

    const headers = Object.entries(parsedResponse.headers || {})
        .map(([key, value]) => `${capitalizeHeader(key)}: ${value}`)
        .join("\r\n");

    return `${statusLine}\r\n${headers}\r\n\r\n${parsedResponse.body || ""}`;
}

export const verifyResponseOutput = (observedResponse: HttpResponse, expectedResponse: HttpResponse) => {
    if (observedResponse.statusCode != expectedResponse.statusCode)
        return false;

    const expectedHeaders = Object.keys(expectedResponse.headers);
    return expectedHeaders.every(key => observedResponse.headers.hasOwnProperty(key) && (expectedResponse.headers[key] == observedResponse.headers[key]))
}