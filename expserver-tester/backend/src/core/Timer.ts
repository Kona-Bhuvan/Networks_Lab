import { ContainerManager } from "./ContainerManager";

enum TimerEvents {
    TEST_UPDATE = 'stage-timer-update',
    TEST_COMPLETE = 'stage-timer-complete',
    EMIT_TO_STAGE_RUNNER = 'timer-event'
}


export class Timer {
    private _currentTime: number;
    private _running: boolean;
    private interval: ReturnType<typeof setTimeout>;
    private callback: (event: string, data: any) => void;
    private containerInstance: ContainerManager;

    get running() {
        return this._running;
    }

    get currentTime() {
        return this._currentTime;
    }

    constructor(containerInstance: ContainerManager, emitterCallback: (event: string, data: any) => void) {
        this.containerInstance = containerInstance;
        this._currentTime = 0;
        this._running = false;
        this.callback = emitterCallback;
    }

    private emitToAllSockets(event: string, data: any) {
        this.callback(event, data);
    }

    private timerStreamCallback = () => {
        this._currentTime += 1;
        this.emitToAllSockets(TimerEvents.TEST_UPDATE, this._currentTime);
    }

    private closeCallback = () => {
        this.emitToAllSockets(TimerEvents.TEST_COMPLETE, this._currentTime);
        this.kill();
    }


    public run() {
        this._running = true;
        this._currentTime = 0;
        this.emitToAllSockets(TimerEvents.TEST_UPDATE, this._currentTime);
        this.interval = setInterval(this.timerStreamCallback, 1000);
    }

    public kill() {
        this._running = false;
        clearInterval(this.interval);
    }
}