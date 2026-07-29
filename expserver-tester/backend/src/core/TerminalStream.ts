import { TERMINAL_MAX_LIMIT } from "../constants";
import { ContainerManager } from "./ContainerManager";

enum TerminalStreamEvents {
    TEST_UPDATE = 'stage-terminal-update',
    TEST_COMPLETE = 'stage-terminal-complete',
    EMIT_TO_STAGE_RUNNER = 'terminal-event',
}

export class TerminalStream {
    // private spawnInstance: ChildProcessWithoutNullStreams;
    private _currentStream: string[]; //send only onel ine at a time or send max 10k-ish lines
    private _running: boolean;

    private callback: (event: string, data: any) => void;
    private streamBuffer: string;
    private containerInstance: ContainerManager;

    get running() {
        return this._running;
    }

    get currentStream() {
        return this._currentStream;
    }

    constructor(containerInstance: ContainerManager, emitterCallback: (event: string, data: any) => void) {
        this.containerInstance = containerInstance;

        this._currentStream = [];
        this.streamBuffer = "";
        this.callback = emitterCallback;

        this._running = false;
    }

    private emitToAllSockets(event: string, data: any) {
        this.callback(event, data);
    }

    private terminalStreamCallback = (data: Buffer) => {
        this.streamBuffer += data.toString();
        const lines = this.streamBuffer.split("\n");
        this.streamBuffer = lines.pop();

        lines.forEach(line => this._currentStream.push(line))

        const toSend = this._currentStream.slice(-TERMINAL_MAX_LIMIT);
        this.emitToAllSockets(TerminalStreamEvents.TEST_UPDATE, toSend);
    }

    private closeCallback = (code: number) => {
        const line = `Process exited with code : ${code || 0}`
        this._currentStream.push(line);

        const toSend = this._currentStream.slice(-TERMINAL_MAX_LIMIT);
        this.emitToAllSockets(TerminalStreamEvents.TEST_COMPLETE, toSend);
        this.kill();
    }


    public run() {
        this._running = true;

        this.containerInstance.on('stdout', this.terminalStreamCallback);
        this.containerInstance.on('stderr', this.terminalStreamCallback);
        this.containerInstance.on('end', this.terminalStreamCallback);
        this.containerInstance.on('close', this.closeCallback);
    }

    public kill() {
        this._running = false;

        this.containerInstance.off('stdout', this.terminalStreamCallback);
        this.containerInstance.off('stderr', this.terminalStreamCallback);
        this.containerInstance.off('end', this.terminalStreamCallback);
        this.containerInstance.off('close', this.closeCallback);
    }
}