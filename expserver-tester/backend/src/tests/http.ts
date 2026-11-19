import { Socket } from "net";
import { ContainerManager } from "../core/ContainerManager";
import { FileSystemEntry, FileType, HttpRequestTest, TestFunction } from "../types";
import { parseHttpResponse, verifyResponseOutput } from "../utils/http";
import * as cheerio from "cheerio";
import { gunzipSync } from "zlib";
import { readFileSync } from "fs";
import { join } from "path";

export const httpRequestParser: TestFunction = (port: number, requestInfo: HttpRequestTest, spawnInstance: ContainerManager) => {
    return new Promise((resolve, _) => {
        let resolved = false;
        const safeResolve = (value: any) => {
            if (resolved) return;
            resolved = true;
            resolve(value);
        };

        const client = new Socket();

        const safeCleanup = () => {
            client.removeAllListeners();
            client.on('error', () => {});
            client.destroy();
        };

        client.on('connectionAttemptFailed', () => {
            safeCleanup();
            return safeResolve({
                passed: false,
                observedBehavior: "server refused connection",
            })
        })

        client.on('connectionAttemptTimeout', () => {
            safeCleanup();
            return safeResolve({
                passed: false,
                observedBehavior: "server connection timed out",
            })
        })

        client.on('error', () => {
            safeCleanup();
            return safeResolve({
                passed: false,
                observedBehavior: "cannot establish a connection with server",
            })
        })

        const verifyResponseCallback = (data: Buffer) => {
            const responseText = data.toString();
            client.off('data', verifyResponseCallback);
            client.end();

            const parsedResponse = parseHttpResponse(responseText);
            if (!verifyResponseOutput(parsedResponse, requestInfo.expectedResponse)) {
                safeCleanup();
                return safeResolve({
                    passed: false,
                    observedBehavior: responseText,
                })
            }
            else {
                safeCleanup();
                return safeResolve({
                    passed: true,
                })
            }
        }

        client.on('data', verifyResponseCallback);

        client.connect(port, spawnInstance.containerName, () => client.write(requestInfo.request(spawnInstance.containerName)))
    })
}


const matchHeaders = (proxyHeaders: Headers, serverHeaders: Headers): boolean => {
    let result: boolean = true;
    proxyHeaders.forEach((value, key) => {
        if (serverHeaders.get(key) !== value)
            result = false;
    });
    return result;
}

const matchBody = (proxyBody: string, serverBody: string) => {
    return (proxyBody === serverBody);
}

export const httpProxyTest: TestFunction = (fileName: string, port: number, proxyPort, spawnInstance: ContainerManager) => {

    return new Promise(async resolve => {
        let resolved = false;
        const safeResolve = (value: any) => {
            if (resolved) return;
            resolved = true;
            resolve(value);
        };

        let responseFromProxy: Response;
        try {
            responseFromProxy = await fetch(`http://${spawnInstance.containerName}:${proxyPort}/${fileName}`);
        }
        catch (error) {
            console.log(`Error: ${error.cause?.code}`)
            return safeResolve({
                passed: false,
                observedBehavior: `Could not connect to proxy server on port ${proxyPort}: ${error.cause?.code || error.message}`,
            });
        }
        let responseFromServer: Response;

        try {
            responseFromServer = await fetch(`http://${spawnInstance.containerName}:${port}/${fileName}`);
        }
        catch (error) {
            console.log(`Error: ${error.cause?.code}`)
            return safeResolve({
                passed: false,
                observedBehavior: `Could not connect to server on port ${port}: ${error.cause?.code || error.message}`,
            });
        }

        if (
            (responseFromProxy.status != responseFromServer.status) ||
            (!matchHeaders(responseFromProxy.headers, responseFromServer.headers)) ||
            (!matchBody(await responseFromProxy.text(), await responseFromServer.text()))
        ) {
            return safeResolve({
                passed: false,
                observedBehavior: "Response received from server didn't match that received from proxy",
            });
        }
        else {
            return safeResolve({
                passed: true,
            })
        }

    })
}


export const httpFileServerTest: TestFunction = (fileName: string, mimeType: string, port: number, spawnInstance: ContainerManager) => {

    return new Promise(async resolve => {
        let response: Response;
        try {
            response = await fetch(`http://${spawnInstance.containerName}:${port}/${fileName}`);
        }
        catch (error) {
            return resolve({
                passed: false,
                observedBehavior: `Error: ${error.cause.code}`,
            })
        }

        const receivedMimeType = response.headers.get('Content-Type');
        if (response.status != 200) {
            return resolve({
                passed: false,
                observedBehavior: `Expected status 200, received ${response.status}`,
            })
        }
        else if (receivedMimeType != mimeType) {
            return resolve({
                passed: false,
                observedBehavior: `Expected file of type ${mimeType}, recieved ${receivedMimeType}`
            })
        }
        else {
            return resolve({
                passed: true,
            })
        }
    })
}

export const httpRedirectTest: TestFunction = (path: string, redirectUrl: string, port: number, spawnInstance: ContainerManager) => {

    return new Promise(async resolve => {
        let response: Response;
        try {
            response = await fetch(`http://${spawnInstance.containerName}:${port}/${path}`, { redirect: 'manual' });
        }
        catch (error) {
            return resolve({
                passed: false,
                observedBehavior: `Error: ${error.cause.code}`,
            })
        }

        const receivedRedirectUrl = response.headers.get('location');
        if (response.status != 302) {
            return resolve({
                passed: false,
                observedBehavior: `Expected a status code 302 but received ${response.status}`,
            })
        }
        else if (response.headers.get('location') !== redirectUrl) {
            return resolve({
                passed: false,
                observedBehavior: `Expected redirect to ${redirectUrl} but received ${receivedRedirectUrl || 'N/A'}`,
            })
        }

        return resolve({
            passed: true,
        })
    })
}

export const httpDirectoryBrowsingTest: TestFunction = (path: string, rootFolderEntry: FileSystemEntry, port: number, spawnInstance: ContainerManager) => {
    return new Promise(async resolve => {
        try {

            const response = await fetch(`http://${spawnInstance.containerName}:${port}${path}`);
            const headers = response.headers;
            const mimeType = headers.get('Content-Type');
            if (mimeType !== 'text/html') {
                return resolve({
                    passed: false,
                    expectedBehavior: "Expected an html file",
                    observedBehavior: `Received file of mime-type: ${mimeType}`
                })
            }

            const body = await response.text();
            const $ = cheerio.load(body);

            const links = $('table tr td a');
            const foundPaths = new Set();

            links.each((_, el) => {
                console.log(el);
                const href = $(el).attr('href');
                if (href)
                    foundPaths.add(href);
            });
            if (rootFolderEntry.type !== FileType.DIRECTORY) {
                return resolve({
                    passed: false,
                    observedBehavior: "Something went wrong",
                })
            }
            const expectedItems = Object.keys(rootFolderEntry.items);
            console.log(foundPaths, expectedItems)

            for (const item of expectedItems) {
                if (!foundPaths.has(item)) {
                    return resolve({
                        passed: false,
                        observedBehavior: "Didn't find all expected directory/file links",
                    })
                }
            }

            return resolve({
                passed: true,
            })
        }
        catch (error) {
            console.log(error);
            return resolve({
                passed: false,
                observedBehavior: "Couldn't establish a connection to the server",
            })
        }
    })
}

export const directoryWalk: TestFunction = (path: string, directoryStructure: FileSystemEntry, port: number, spawnInstance: ContainerManager) => {
    return new Promise(async resolve => {
        try {

            const response = await fetch(`http://${spawnInstance.containerName}:${port}${path}`);
            const headers = response.headers;
            const mimeType = headers.get('Content-Type');
            if (directoryStructure.type === FileType.DIRECTORY) {
                if (mimeType !== 'text/html') {
                    return resolve({
                        passed: false,
                        expectedBehavior: `Expected path ${path} to serve an html file`,
                        observedBehavior: `Received file of mime-type: ${mimeType}`,
                    })
                }

                const body = await response.text();
                const $ = cheerio.load(body);

                const links = $('table tr td a');
                const foundPaths = new Set();

                links.each((_, el) => {
                    const href = $(el).attr('href');
                    if (href)
                        foundPaths.add(href);
                });
                const expectedItems = Object.keys(directoryStructure.items);

                for (const item of expectedItems) {
                    if (!foundPaths.has(item)) {
                        return resolve({
                            passed: false,
                            observedBehavior: "Didn't find all expected directory/file links",
                        })
                    }
                    const itemWalkResponse = await directoryWalk(item, directoryStructure.items[item], port, spawnInstance);
                    if (itemWalkResponse.passed == false) {
                        return resolve(itemWalkResponse);
                    }
                }

                return resolve({
                    passed: true,
                })
            }
            else {
                if (mimeType !== directoryStructure.mimeType) {
                    return resolve({
                        passed: false,
                        expectedBehavior: `Expected file of mime-type: ${directoryStructure.mimeType}`,
                        observedBehavior: `Received file of mime-type: ${mimeType}`,
                    })
                }

                return resolve({
                    passed: true,
                })
            }
        }
        catch (error) {
            console.log(error);
            return resolve({
                passed: false,
                observedBehavior: "Couldn't establish a connection to the server",
            })
        }
    })
}



export const gzipHttpRequestParser: TestFunction = (
    port: number,
    requestInfo: HttpRequestTest,
    spawnInstance: ContainerManager
) => {
    return new Promise((resolve, _) => {
        let resolved = false;

        const safeResolve = (value: any) => {
            if (resolved) return;
            resolved = true;
            resolve(value);
        };

        const client = new Socket();
        const chunks: Buffer[] = [];

        const safeCleanup = () => {
            client.removeAllListeners();
            client.on("error", () => {});
            client.destroy();
        };

        client.on("connectionAttemptFailed", () => {
            safeCleanup();

            return safeResolve({
                passed: false,
                observedBehavior: "server refused connection",
            });
        });

        client.on("connectionAttemptTimeout", () => {
            safeCleanup();

            return safeResolve({
                passed: false,
                observedBehavior: "server connection timed out",
            });
        });

        client.on("error", () => {
            safeCleanup();

            return safeResolve({
                passed: false,
                observedBehavior: "cannot establish a connection with server",
            });
        });

        client.on("data", (data: Buffer) => {
            chunks.push(Buffer.from(data));
        });

        client.on("end", () => {
            try {
                const response = Buffer.concat(chunks);

                /*
                 * HTTP headers and body are separated by:
                 *
                 * \r\n\r\n
                 */
                const headerSeparator = Buffer.from("\r\n\r\n");
                const headerEnd = response.indexOf(headerSeparator);

                if (headerEnd === -1) {
                    safeCleanup();

                    return safeResolve({
                        passed: false,
                        observedBehavior:
                            "invalid HTTP response: headers not found",
                    });
                }

                const headerBuffer = response.subarray(0, headerEnd);

                const body = response.subarray(
                    headerEnd + headerSeparator.length
                );

                /*
                 * Parse only the HTTP headers as text.
                 *
                 * The body MUST remain a Buffer because it contains
                 * compressed binary data.
                 */
                const headerLines = headerBuffer
                    .toString()
                    .split("\r\n");

                const statusLine = headerLines.shift();

                if (!statusLine) {
                    safeCleanup();

                    return safeResolve({
                        passed: false,
                        observedBehavior:
                            "invalid HTTP response: missing status line",
                    });
                }

                const statusCode = Number(statusLine.split(" ")[1]);

                /*
                 * Check status code.
                 */
                if (
                    statusCode !==
                    requestInfo.expectedResponse.statusCode
                ) {
                    safeCleanup();

                    return safeResolve({
                        passed: false,
                        observedBehavior:
                            `Expected status code ${requestInfo.expectedResponse.statusCode}, ` +
                            `received ${statusCode}`,
                    });
                }

                /*
                 * Convert response headers into a map.
                 */
                const responseHeaders = new Map<string, string>();

                for (const line of headerLines) {
                    const separatorIndex = line.indexOf(":");

                    if (separatorIndex === -1) {
                        continue;
                    }

                    const key = line
                        .slice(0, separatorIndex)
                        .trim()
                        .toLowerCase();

                    const value = line
                        .slice(separatorIndex + 1)
                        .trim()
                        .toLowerCase();

                    responseHeaders.set(key, value);
                }

                /*
                 * GZIP must be explicitly indicated.
                 */
                const contentEncoding =
                    responseHeaders.get("content-encoding");

                if (contentEncoding !== "gzip") {
                    safeCleanup();

                    return safeResolve({
                        passed: false,
                        observedBehavior:
                            `Expected Content-Encoding: gzip, ` +
                            `received ${contentEncoding || "none"}`,
                    });
                }

                /*
                 * Decompress the response.
                 *
                 * gunzipSync() will throw if the response is:
                 * - not valid GZIP
                 * - corrupted
                 * - incomplete
                 * - incorrectly finalized
                 */
                let decompressedBody: Buffer;

                try {
                    decompressedBody = gunzipSync(body);
                } catch (error) {
                    safeCleanup();

                    return safeResolve({
                        passed: false,
                        observedBehavior:
                            `GZIP decompression failed: ${
                                error instanceof Error
                                    ? error.message
                                    : String(error)
                            }`,
                    });
                }

                /*
                 * Extract the requested path.
                 *
                 * Example:
                 *
                 * GET /sample.txt HTTP/1.1
                 *
                 * -> /sample.txt
                 */
                const requestLine = requestInfo
                    .request(spawnInstance.containerName)
                    .split("\r\n")[0];

                const requestPath = requestLine.split(" ")[1];

                if (!requestPath) {
                    safeCleanup();

                    return safeResolve({
                        passed: false,
                        observedBehavior:
                            "could not determine requested file",
                    });
                }

                /*
                 * Remove the leading '/' before joining with public/.
                 */
                const relativePath = decodeURIComponent(
                    requestPath.replace(/^\/+/, "")
                );

                const originalFilePath = join(
                    "public/common",
                    relativePath
                );

                let originalBody: Buffer;

                try {
                    originalBody = readFileSync(originalFilePath);
                } catch (error) {
                    safeCleanup();

                    return safeResolve({
                        passed: false,
                        observedBehavior:
                            `could not read original file: ${originalFilePath}`,
                    });
                }

                /*
                 * Compare the decompressed response with the
                 * original file byte-for-byte.
                 *
                 * Buffer.equals() works for both:
                 * - text files
                 * - binary files
                 */
                if (!decompressedBody.equals(originalBody)) {
                    safeCleanup();

                    return safeResolve({
                        passed: false,
                        observedBehavior:
                            "decompressed response does not match the original file",
                    });
                }

                safeCleanup();

                return safeResolve({
                    passed: true,
                });
            } catch (error) {
                safeCleanup();

                return safeResolve({
                    passed: false,
                    observedBehavior:
                        error instanceof Error
                            ? error.message
                            : String(error),
                });
            }
        });

        client.connect(
            port,
            spawnInstance.containerName,
            () => {
                client.write(
                    requestInfo.request(
                        spawnInstance.containerName
                    )
                );
            }
        );
    });
};