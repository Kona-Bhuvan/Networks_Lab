import { ResourceStats } from "../types";
import { ContainerManager } from "./ContainerManager";

enum ResourceMonitorEvents {
    TEST_UPDATE = 'stage-stats-update',
    TEST_COMPLETE = 'stage-stats-complete',
    EMIT_TO_STAGE_RUNNER = 'process-stats-event',
}

export class ResourceMonitor {
    // private spawnInstance: ChildProcessWithoutNullStreams;
    private containerInstance: ContainerManager;
    private _currentUsage: ResourceStats;
    private timeout: ReturnType<typeof setTimeout>;
    private _running: boolean;
    private _callback: (event: string, data: any) => void;

    get running() {
        return this._running;
    }

    get currentUsage() {
        return this._currentUsage;
    }

    constructor(containerInstance: ContainerManager, emitterCallback: (event: string, data: any) => void) {
        this.containerInstance = containerInstance;

        this._currentUsage = {
            cpu: 0,
            mem: 0,
        }

        this._running = false;
        this._callback = emitterCallback;
    }

    private async getUsage() {
        try {
            const { cpuUsage, memUsage } = await this.containerInstance.getResourceStats();
            this._currentUsage = { cpu: cpuUsage, mem: memUsage };
        }
        catch (err) {
            this._currentUsage = { cpu: 0, mem: 0 };
        }
    }

    private emitToAllSockets(event: string, data: any) {
        this._callback(event, data);
    }

    private closeCallback = () => {
        this.emitToAllSockets(ResourceMonitorEvents.TEST_COMPLETE, this._currentUsage);
        this.kill();
    }

    private resourceStreamCallback = () => {
        this.getUsage();
        this.emitToAllSockets(ResourceMonitorEvents.TEST_UPDATE, this._currentUsage);
    }

    public run() {
        this._running = true;

        this.timeout = setInterval(this.resourceStreamCallback, 1000);
        this.containerInstance.once('close', this.closeCallback)
    }

    public kill() {
        this._running = false;

        clearInterval(this.timeout);
    }
}