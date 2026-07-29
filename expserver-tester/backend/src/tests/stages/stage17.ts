import { DirectoryBrowser, FileEntry, FileType, Test } from "../../types";
import { directoryWalk, httpDirectoryBrowsingTest, httpFileServerTest, httpRedirectTest } from "../http";

const directoryStructure: DirectoryBrowser = {
    '/': {
        type: FileType.DIRECTORY,
        items: {
            '/cat.jpg': {
                type: FileType.FILE,
                mimeType: 'image/jpeg',
            },
            '/sample.pdf': {
                type: FileType.FILE,
                mimeType: 'application/pdf',
            },
            '/sample.txt': {
                type: FileType.FILE,
                mimeType: 'text/plain',
            },
            '/xps_config.json': {
                path: '/xps_config.json',
                type: FileType.FILE,
                mimeType: 'application/json'
            },
            '/test': {
                type: FileType.DIRECTORY,
                items: {
                    '/test/cat.jpg': {
                        type: FileType.FILE,
                        mimeType: 'image/jpeg',
                    },
                    '/test/sample.pdf': {
                        type: FileType.FILE,
                        mimeType: 'application/pdf',
                    },
                    '/test/sample.txt': {
                        type: FileType.FILE,
                        mimeType: 'text/plain',
                    },
                }
            }
        }
    }
}


export const stage17Tests: Omit<Test, 'status'>[] = [
    {
        title: "Verify Headers",
        description: "The server should provide valid headers and status response for the request, which is verified in this test",
        testInput: "The client sends a GET request on path '/' to the server",
        expectedBehavior: "Client sends an html page containing links to all the directories contained within the page",
        testFunction: async (...args) => {
            const response = await httpFileServerTest('/', 'text/html', 8001, ...args);
            return response;
        }
    },
    {
        title: "Verify population of content on directories",
        description: "This test ensures that the HTML file served consists of all the directories and files present in the actual directory",
        testInput: "The client sends a GET request on path '/'",
        expectedBehavior: "Client expects links to the files and directories present in that directory (note: client already knows contents of the direcotry)",
        testFunction: async (...args) => {
            const response = await httpDirectoryBrowsingTest('/', directoryStructure['/'], 8001, ...args);
            return response;
        }
    },
    {
        title: "Verify file serving",
        description: "This test ensures that the server is able to serve files properly, as done in previous",
        testInput: "Client sends a GET request on a file",
        expectedBehavior: "Server should send the file with appropriate mime-type and other relevant headers",
        testFunction: async (...args) => {
            const response = await httpFileServerTest('/sample.pdf', (directoryStructure['/'].items['/sample.pdf'] as FileEntry).mimeType, 8001, ...args);
            return response;
        }
    },
    {
        title: "Full Directory walk",
        description: "This test runs a deep pass through each file and directory starting at the root, and ensures all files and directories give output as expected",
        testInput: "sends an initial GET request to path '/', and also to each file within each route",
        expectedBehavior: "all of the directories should serve html files, containing all the expected links. And all the files should be served properly as done in previous stages",
        testFunction: async (...args) => {
            const response = await directoryWalk('/', directoryStructure['/'], 8001, ...args);
            return response;
        }
    }
]