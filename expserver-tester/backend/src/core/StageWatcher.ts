import { Socket } from "../types";
import { StageRunner } from "./StageRunner";

export class StageWatcher {
    private _socket: Socket;
    public stageRunner: StageRunner;
    private _stageNo: number;
    private _userId: string;

    get stageNo() {
        return this._stageNo;
    }

    get userId() {
        return this._userId;
    }

    constructor(socket: Socket, userId: string) {
        this._socket = socket;
        this._userId = userId;
    }

    public changeListeningStage(stageNo: number) {
        this._stageNo = stageNo;
    }

    public emit(ev: string, ...args: any[]) {
        return this._socket.emit(ev, ...args);
    }

}