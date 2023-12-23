import { invoke } from '@tauri-apps/api';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

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
        this._onExit = new EventEmitter2();
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
            this._exitted = false;
            this.pid = pid;
            this.readData();
        });
    }
    dispose() {
        throw new Error("Method not implemented.");
    }
    get onData() { return this._onData.event; }
    get onExit() { return this._onExit.event; }
    resize(columns, rows) {
        this.cols = columns;
        this.rows = rows;
        invoke('plugin:pty|resize', { pid: this.pid, cols: columns, rows }).catch(e => {
            console.error('Resize error: ', e);
            this.errorCheck();
        });
    }
    clear() {
        throw new Error("Method not implemented.");
    }
    write(data) {
        invoke('plugin:pty|write', { pid: this.pid, data }).catch(e => {
            console.error('Writing error: ', e);
            this.errorCheck();
        });
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
    readData() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                for (;;) {
                    const data = yield invoke('plugin:pty|read', { pid: this.pid });
                    this._onData.fire(data);
                }
            }
            catch (e) {
                this.errorCheck();
                if (typeof e === 'string' && e.includes('EOF')) {
                    return;
                }
                console.error('Reading error: ', e);
            }
        });
    }
    errorCheck() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._exitted) {
                return;
            }
            try {
                const exitCode = yield invoke('plugin:pty|exitstatus', { pid: this.pid });
                if (exitCode != null) {
                    this._exitted = true;
                    this._onExit.fire({ exitCode });
                }
            }
            catch (e) {
                console.error(e);
            }
        });
    }
}

export { spawn };
//# sourceMappingURL=index.es.js.map
