import { invoke } from '@tauri-apps/api';
import { listen, emit } from '@tauri-apps/api/event';

class EventEmitter2 {
    constructor() {
        this._listeners = [];
    }
    get event() {
        if (!this._event) {
            this._event = (listener) => {
                this._listeners.push(listener);
                const disposable = {
                    dispose: () => {
                        for (let i = 0; i < this._listeners.length; i++) {
                            if (this._listeners[i] === listener) {
                                this._listeners.splice(i, 1);
                                return;
                            }
                        }
                    }
                };
                return disposable;
            };
        }
        return this._event;
    }
    fire(data) {
        const queue = [];
        for (let i = 0; i < this._listeners.length; i++) {
            queue.push(this._listeners[i]);
        }
        for (let i = 0; i < queue.length; i++) {
            queue[i].call(undefined, data);
        }
    }
}

function spawn(file, args, options) {
    return new TauriPty(file, args, options);
}
class TauriPty {
    constructor(file, args, opt) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        this._onData = new EventEmitter2();
        args = typeof args === 'string' ? [args] : args !== null && args !== void 0 ? args : [];
        const invokeArgs = {
            file, args,
            termName: (_a = opt === null || opt === void 0 ? void 0 : opt.name) !== null && _a !== void 0 ? _a : 'Terminal',
            cols: (_b = opt === null || opt === void 0 ? void 0 : opt.cols) !== null && _b !== void 0 ? _b : null,
            rows: (_c = opt === null || opt === void 0 ? void 0 : opt.rows) !== null && _c !== void 0 ? _c : null,
            cwd: (_d = opt === null || opt === void 0 ? void 0 : opt.cwd) !== null && _d !== void 0 ? _d : null,
            env: (_e = opt === null || opt === void 0 ? void 0 : opt.env) !== null && _e !== void 0 ? _e : {},
            encoding: (_f = opt === null || opt === void 0 ? void 0 : opt.encoding) !== null && _f !== void 0 ? _f : null,
            handleFlowControl: (_g = opt === null || opt === void 0 ? void 0 : opt.handleFlowControl) !== null && _g !== void 0 ? _g : null,
            flowControlPause: (_h = opt === null || opt === void 0 ? void 0 : opt.flowControlPause) !== null && _h !== void 0 ? _h : null,
            flowControlResume: (_j = opt === null || opt === void 0 ? void 0 : opt.flowControlResume) !== null && _j !== void 0 ? _j : null,
        };
        invoke('plugin:pty|spawn', invokeArgs).then(pid => {
            this.pid = pid;
            listen(`onDataUp${pid}`, event => {
                this._onData.fire(event.payload.message);
            });
        });
    }
    dispose() {
        throw new Error("Method not implemented.");
    }
    get onData() { return this._onData.event; }
    resize(columns, rows) {
        throw new Error("Method not implemented.");
    }
    clear() {
        throw new Error("Method not implemented.");
    }
    write(data) {
        console.log(data);
        emit(`onDataDown${this.pid}`, { message: data });
    }
    kill(signal) {
        throw new Error("Method not implemented.");
    }
    pause() {
        throw new Error("Method not implemented.");
    }
    resume() {
        throw new Error("Method not implemented.");
    }
}

export { spawn };
//# sourceMappingURL=index.es.js.map
