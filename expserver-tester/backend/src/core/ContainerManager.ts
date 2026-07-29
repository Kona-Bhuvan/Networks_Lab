import Docker, { Container } from 'dockerode';
import { EventEmitter } from 'eventemitter3';
import { IMAGE_NAME, PUBLIC_DIR, WORKDIR } from '../constants';
import Config from '../config';
import * as fs from 'fs';
import * as path from 'path';
export class ContainerManager extends EventEmitter {
    private _containerName: string;
    private _binaryId: string;
    private _stageNo: number;
    private initialized: boolean;
    private _running: boolean;
    private _container: Container | null;
    private readonly ports: number[] = [3000, 8001, 8002, 8003, 8004, 8080];
    private docker: Docker;
    private _stream: NodeJS.ReadWriteStream | null;
    private _pid: number;
    private containerConfig: Object;
    private timeoutRef: NodeJS.Timeout | null;
    private pythonServerRunning: boolean;
    public static removingContainers = new Set<string>();
    private _logOffset: number = 0;
    private _currentLabel: string = 'warmup';
    private _runId: string = '';
    private _isBeingKilled: boolean = false;

    get containerName(): string {
        return this._containerName;
    }

    get pid(): number {
        return this._pid;
    }

    get binaryId(): string {
        return this._binaryId;
    }

    get stream() {
        return this._stream;
    }

    get running() {
        return this._running;
    }

    get container() {
        return this._container;
    }

    constructor(containerName: string, binaryId: string, publicPath: string, stageNo: number) {
        super();
        this._containerName = containerName;
        this._binaryId = binaryId;
        this._stageNo = stageNo;
        this.initialized = false;
        this._container = null;
        this.docker = new Docker();
        this._running = false;
        this.initialized = false;
        this.timeoutRef = null;
        this.pythonServerRunning = false;


        const customPublicDir = `${Config.HOST_PWD}/public/${publicPath}`;
        const workDir = `${Config.HOST_PWD}/uploads`;
        const logFile = `${WORKDIR}/${this._binaryId}.log`;
        const entryCmd = [
            'sh', '-c',
            `nohup python3 -m http.server 3000 -d ${PUBLIC_DIR} > /dev/null 2>&1 & echo $! > /tmp/http_server.pid && export ASAN_OPTIONS=detect_leaks=0 && ./${this._binaryId} ${PUBLIC_DIR}/xps_config.json > ${logFile} 2>&1`,
        ]

        console.log(entryCmd)

        this.containerConfig = {
            Image: IMAGE_NAME,
            name: this._containerName,
            Cmd: entryCmd,
            HostConfig: {
                Binds: [`${workDir}:${WORKDIR}`, `${customPublicDir}:${PUBLIC_DIR}`],
                NetworkMode: Config.NETWORK_INTERFACE,
                Privileged: true
            }
        }
    }

    public async start(): Promise<void> {
        if (this.timeoutRef)
            clearTimeout(this.timeoutRef)

        if (this.initialized || this.running)
            return;

        try {
            await this.startContainer();
            if (!this.initialized) {
                return;
            }
        }
        catch (error) {
            this.timeoutRef = setTimeout(() => {
                this.start();
            }, 1000);
            return;
        }

        this._pid = (await this._container.inspect()).State.Pid

        const eventStream = await this.docker.getEvents();
        eventStream.on('data', (chunk) => {
            const event = JSON.parse(chunk.toString());
            if (event.Type == 'container' && event.Actor.Attributes.name == this._containerName && (event.Action == 'stop' || event.Action == 'die')) {
                this._running = false;
                if (!this._container)
                    return;
                this._container.inspect().then(async (data) => {
                    const exitCode = data.State.ExitCode;

                    // Always print logs when container exits
                    this.printLogsFromFile(exitCode);

                    this.emit('close', exitCode);
                    if (this.initialized)
                        this.emit('error', exitCode);

                })

            }
        })

        this._running = true;
    }


    public async restartContainer(): Promise<void> {
        console.log('restarting container');
        try {
            await this._container.restart();
            this._pid = (await this._container.inspect()).State.Pid

        }
        catch (error) {
            console.log(error);
            await this._container.start();
        }
    }

    public async kill(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            if (!this.initialized || (this._container === null)) {
                return resolve();

            }
            if (ContainerManager.removingContainers.has(this._containerName)) {
                console.log(`Container: ${this._containerName} is already being removed`);
                return resolve();
            }

            this._isBeingKilled = true;
            ContainerManager.removingContainers.add(this._containerName);
            try {
                this.initialized = false;
                this._running = false;
                const inspect = await this._container.inspect();
                if (inspect.State.Running) {
                    console.log(`Stopping container: ${this._containerName}`);
                    await this._container.kill();
                }

                // Capture final logs before removal
                this.printLogsFromFile(137);

                console.log(`Removing container: ${this._containerName}`);
                await this._container.remove({ force: true });

                this._container = null;
                this._stream = null;
                this._pid = -1;
            }
            catch (error) {
                if (error.statusCode != 409)
                    console.log(error);
            }

            this._isBeingKilled = false;
            setTimeout(() => {
                ContainerManager.removingContainers.delete(this._containerName);
                return resolve();
            }, 1000); // wait 1 second for proper shut down of container
        })
    }

    private async waitForRemoval(): Promise<void> {
        while (ContainerManager.removingContainers.has(this._containerName)) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    public async detachStream(): Promise<void> {
        if (!this._container)
            return;

        this.emit('stdout', "-- stream paused to prevent overflow in case of unnecessary print statements --\n");

        if (this._stream) {
            this._stream.removeAllListeners();
            this._stream = null;
        }
    }

    public async attachStream(): Promise<void> {
        if (!this._container)
            return;

        this._stream = await this._container.attach({
            stream: true,
            stdout: true,
            stderr: true,
        })

        this.emit('stdout', '-- stream started / resumed --\n');


        this._stream.on('data', (chunk) => {
            this.emit('stdout', chunk.toString());
        })

        this._stream.on('error', (err) => {
            this.emit('stderr', err);
        })

        this._stream.on('end', () => {
            this.emit('end', '--- End of Stream ---\n');
        })
    }



    public setRunId(runId: string): void {
        this._runId = runId;
    }

    public setLogLabel(label: string): void {
        this._currentLabel = label;
    }

    public printNewLogs(label?: string): void {
        const useLabel = label || this._currentLabel;
        try {
            const logPath = path.join('/app/uploads', `${this._binaryId}.log`);
            if (fs.existsSync(logPath)) {
                const stats = fs.statSync(logPath);
                const fileSize = stats.size;

                if (fileSize > this._logOffset) {
                    const fd = fs.openSync(logPath, 'r');
                    const bufferSize = fileSize - this._logOffset;
                    const buffer = Buffer.alloc(bufferSize);

                    fs.readSync(fd, buffer, 0, bufferSize, this._logOffset);
                    fs.closeSync(fd);

                    const content = buffer.toString('utf-8');

                    // Save to file (last 100 lines only)
                    const logsDir = path.join(__dirname, '../../public/logs');
                    if (!fs.existsSync(logsDir)) {
                        fs.mkdirSync(logsDir, { recursive: true });
                    }
                    const filename = this._runId
                        ? `stage_${this._stageNo}_${this._runId}-${useLabel}.log`
                        : `stage_${this._stageNo}-${useLabel}.log`;
                    const destinationFile = path.join(logsDir, filename);

                    let totalContent = content;
                    if (fs.existsSync(destinationFile)) {
                        const existing = fs.readFileSync(destinationFile, 'utf-8');
                        totalContent = existing + content;
                    }

                    const allLines = totalContent.split('\n');
                    const truncated = allLines.slice(-100).join('\n');
                    fs.writeFileSync(destinationFile, truncated);

                    // Console log (last 100 lines for consistency)
                    console.log(`\n--- [${useLabel}] Container ${this._containerName} logs (saved to stage_${this._stageNo}-${useLabel}.log) ---`);
                    console.log(truncated);
                    console.log(`--- End of [${useLabel}] logs ---\n`);

                    this._logOffset = fileSize;
                }
            }
        } catch (err) {
            console.log(`Failed to process incremental logs for ${this._containerName} (${useLabel}):`, err.message);
        }
    }

    private printLogsFromFile(exitCode: number): void {
        try {
            const logPath = path.join('/app/uploads', `${this._binaryId}.log`);
            const exitLabel = (exitCode === 0 || exitCode === 137) ? this._currentLabel : `Exit-${exitCode}`;
            this.printNewLogs(exitLabel);
            if (fs.existsSync(logPath)) {
                fs.unlinkSync(logPath);
            }
        } catch (err) {
            console.log(`Failed to clean up log file for ${this._containerName}:`, err.message);
        }
    }

    private async startContainer(): Promise<void> {
        this._logOffset = 0;
        this._isBeingKilled = false;
        await this.waitForRemoval();

        // Always try to remove any leftover container with the same name first
        try {
            const existing = this.docker.getContainer(this._containerName);
            await existing.kill().catch(() => { });
            await existing.remove({ force: true });
            console.log(`Removed leftover container: ${this._containerName}`);
        } catch (_) {
            // No existing container, that's fine
        }

        try {
            this._container = await this.docker.createContainer(this.containerConfig);
        }
        catch (error) {
            console.log("Failed to create container:", error.message);
            this._container = null;
            return;
        }

        try {
            await this.attachStream();
            this.pythonServerRunning = true;
            await this._container.start();
            const message = await this.waitForContainerToRun();
            console.log(message);
        }
        catch (error) {
            console.log(error)
            // Container already removed by waitForContainerToRun, just reset reference
            this._container = null;
        }
    }

    private waitForContainerToRun(): Promise<string> {
        return new Promise((resolve, reject) => {
            const interval = setInterval(async () => {
                if (!this._container) {
                    clearInterval(interval);
                    return;
                }
                const data = await this._container.inspect().catch(() => null);
                if (!data) return;

                const isRunning = data.State.Running;
                const hasExited = data.State.Status == 'exited';
                const exitCode = data.State.ExitCode;

                if (hasExited) {
                    clearInterval(interval);
                    const crashed = !this._isBeingKilled && exitCode !== 0 && exitCode !== 137;
                    if (crashed) {
                        console.log(`!!! Container ${this._containerName} CRASHED with code ${exitCode} !!!`);
                    }

                    // Read logs from file
                    this.printLogsFromFile(exitCode);

                    // Remove the exited container to prevent 409 conflicts
                    if (!ContainerManager.removingContainers.has(this._containerName)) {
                        ContainerManager.removingContainers.add(this._containerName);
                        try {
                            await this._container.remove({ force: true });
                            console.log(`Removed exited container: ${this._containerName}`);
                        } catch (removeErr) {
                            console.log(`Failed to remove exited container ${this._containerName}:`, removeErr.message);
                        } finally {
                            ContainerManager.removingContainers.delete(this._containerName);
                        }
                    }

                    if (!this.initialized) {
                        return reject(`Container ${this._containerName} exited with code ${exitCode}`);
                    }

                    this.initialized = false;
                    this._running = false;
                    this.emit('close', exitCode);
                    return;
                }

                if (isRunning && !this.initialized) {
                    this.initialized = true;
                    resolve(`Started container: ${this._containerName} `);
                }
            }, 1000);
        })
    }

    public async getResourceStats(): Promise<{ cpuUsage: number, memUsage: number }> {
        if (!this.initialized || !this._container)
            return { cpuUsage: -1, memUsage: -1 };

        try {
            const exec = await this._container.exec({
                Cmd: ['ps', '-p', '1', '-o', '%cpu,%mem,cmd'],
                AttachStdout: true,
                AttachStderr: true,
            });

            const stream = await exec.start({
                hijack: true,
                stdin: false,
            });

            let output = '';
            stream.on('data', chunk => {
                output += chunk.toString();
            })

            return new Promise((resolve, reject) => {
                stream.on('end', () => {
                    try {
                        const lines = output.split('\n');
                        const data = lines[1].match(/^[^\d]*(\d+\.\d+)\s+(\d+\.\d+)/m);
                        if (data) {
                            const [_, cpu, mem] = data;
                            const cpuUsage = parseFloat(cpu);
                            const memUsage = parseFloat(mem);
                            return resolve({
                                cpuUsage,
                                memUsage,
                            });
                        }
                        else {
                            return reject({
                                cpuUsage: 0,
                                memUsage: 0,
                            });
                        }
                    }
                    catch (e) {
                        return reject({
                            cpuUsage: 0,
                            memUsage: 0,
                        });
                    }
                })
            })
        } catch (error) {
            return { cpuUsage: -1, memUsage: -1 };
        }
    }

    public stopPythonServer() {
        return new Promise(async (resolve) => {
            if (!this.initialized || !this._container) {
                return resolve({ message: "container not running" });
            }
            const exec = await this._container.exec({
                Cmd: ['sh', '-c', 'kill $(cat /tmp/http_server.pid) && rm -f /tmp/http_server.pid'],
                AttachStderr: false,
                AttachStdout: false,
            });

            await exec.start({ hijack: true, stdin: false });

            setTimeout(() => {
                resolve({ message: "shutdown" })
            }, 1000);
        })
    }
}
