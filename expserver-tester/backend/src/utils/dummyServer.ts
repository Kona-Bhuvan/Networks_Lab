import Express from 'express';
import { createServer } from 'net';
export const setupHttpServer = (serverPort: number, listenerCallback: () => Promise<void> | void, errorCallback: (err: Error) => Promise<void> | void) => {
    const httpServer = Express();

    httpServer.get('/:num', (req, res) => {
        const num = req.params.num;
        res.setHeader('Date', 'doesnt-matter');
        res.json({ message: "Hello, World!", num });
    })

    const serverInstance = httpServer.listen(serverPort, listenerCallback);
    serverInstance.on('error', errorCallback);

    return serverInstance;
}

export const setupTcpSesrver = (serverPort: number, callbacks: { listenerCallback: () => Promise<void> | void, errorCallback: (err: Error) => Promise<void> | void, receivedDataCallback?: (data: string) => Promise<void> | void }) => {
    const { listenerCallback, errorCallback, receivedDataCallback } = callbacks;

    const server = createServer((socket) => {
        socket.setEncoding('utf8');

        if (receivedDataCallback)
            socket.on('data', receivedDataCallback);
    })

    server.listen(serverPort, listenerCallback);
    server.on('error', errorCallback);
    return server;
}