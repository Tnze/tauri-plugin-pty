/**
 * Copyright (c) 2017, Daniel Imms (MIT License).
 * Copyright (c) 2018, Microsoft Corporation (MIT License).
 * Copyright (c) 2023, Tnze (MIT License).
 */
import { invoke } from "@tauri-apps/api"
import { EventEmitter2 } from "./eventEmitter2";

/**
     * Forks a process as a pseudoterminal.
     * @param file The file to launch.
     * @param args The file's arguments as argv (string[]) or in a pre-escaped CommandLine format
     * (string). Note that the CommandLine option is only available on Windows and is expected to be
     * escaped properly.
     * @param options The options of the terminal.
     * @see CommandLineToArgvW https://msdn.microsoft.com/en-us/library/windows/desktop/bb776391(v=vs.85).aspx
     * @see Parsing C++ Comamnd-Line Arguments https://msdn.microsoft.com/en-us/library/17w5ykft.aspx
     * @see GetCommandLine https://msdn.microsoft.com/en-us/library/windows/desktop/ms683156.aspx
     */
export function spawn(file: string, args: string[] | string, options: IPtyForkOptions | IWindowsPtyForkOptions): IPty {
    return new TauriPty(file, args, options)
}

export interface IBasePtyForkOptions {

    /**
     * Name of the terminal to be set in environment ($TERM variable).
     */
    name?: string;

    /**
     * Number of intial cols of the pty.
     */
    cols?: number;

    /**
     * Number of initial rows of the pty.
     */
    rows?: number;

    /**
     * Working directory to be set for the child program.
     */
    cwd?: string;

    /**
     * Environment to be set for the child program.
     */
    env?: { [key: string]: string | undefined };

    /**
     * String encoding of the underlying pty.
     * If set, incoming data will be decoded to strings and outgoing strings to bytes applying this encoding.
     * If unset, incoming data will be delivered as raw bytes (Buffer type).
     * By default 'utf8' is assumed, to unset it explicitly set it to `null`.
     */
    encoding?: string | null;

    /**
     * (EXPERIMENTAL)
     * Whether to enable flow control handling (false by default). If enabled a message of `flowControlPause`
     * will pause the socket and thus blocking the child program execution due to buffer back pressure.
     * A message of `flowControlResume` will resume the socket into flow mode.
     * For performance reasons only a single message as a whole will match (no message part matching).
     * If flow control is enabled the `flowControlPause` and `flowControlResume` messages are not forwarded to
     * the underlying pseudoterminal.
     */
    handleFlowControl?: boolean;

    /**
     * (EXPERIMENTAL)
     * The string that should pause the pty when `handleFlowControl` is true. Default is XOFF ('\x13').
     */
    flowControlPause?: string;

    /**
     * (EXPERIMENTAL)
     * The string that should resume the pty when `handleFlowControl` is true. Default is XON ('\x11').
     */
    flowControlResume?: string;
}

export interface IPtyForkOptions extends IBasePtyForkOptions {
    /**
     * Security warning: use this option with great caution,
     * as opened file descriptors with higher privileges might leak to the child program.
     */
    uid?: number;
    gid?: number;
}

export interface IWindowsPtyForkOptions extends IBasePtyForkOptions {
    /**
     * Whether to use the ConPTY system on Windows. When this is not set, ConPTY will be used when
     * the Windows build number is >= 18309 (instead of winpty). Note that ConPTY is available from
     * build 17134 but is too unstable to enable by default.
     *
     * This setting does nothing on non-Windows.
     */
    useConpty?: boolean;

    /**
     * Whether to use PSEUDOCONSOLE_INHERIT_CURSOR in conpty.
     * @see https://docs.microsoft.com/en-us/windows/console/createpseudoconsole
     */
    conptyInheritCursor?: boolean;
}

/**
 * An interface representing a pseudoterminal, on Windows this is emulated via the winpty library.
 */
export interface IPty {
    /**
     * The process ID of the outer process.
     */
    readonly pid: number;

    /**
     * The column size in characters.
     */
    readonly cols: number;

    /**
     * The row size in characters.
     */
    readonly rows: number;

    /**
     * The title of the active process.
     */
    readonly process: string;

    /**
     * (EXPERIMENTAL)
     * Whether to handle flow control. Useful to disable/re-enable flow control during runtime.
     * Use this for binary data that is likely to contain the `flowControlPause` string by accident.
     */
    handleFlowControl: boolean;

    /**
     * Adds an event listener for when a data event fires. This happens when data is returned from
     * the pty.
     * @returns an `IDisposable` to stop listening.
     */
    readonly onData: IEvent<string>;

    /**
     * Adds an event listener for when an exit event fires. This happens when the pty exits.
     * @returns an `IDisposable` to stop listening.
     */
    readonly onExit: IEvent<{ exitCode: number, signal?: number }>;

    /**
     * Resizes the dimensions of the pty.
     * @param columns The number of columns to use.
     * @param rows The number of rows to use.
     */
    resize(columns: number, rows: number): void;

    /**
     * Clears the pty's internal representation of its buffer. This is a no-op
     * unless on Windows/ConPTY. This is useful if the buffer is cleared on the
     * frontend in order to synchronize state with the backend to avoid ConPTY
     * possibly reprinting the screen.
     */
    clear(): void;

    /**
     * Writes data to the pty.
     * @param data The data to write.
     */
    write(data: string): void;

    /**
     * Kills the pty.
     * @param signal The signal to use, defaults to SIGHUP. This parameter is not supported on
     * Windows.
     * @throws Will throw when signal is used on Windows.
     */
    kill(signal?: string): void;

    /**
     * Pauses the pty for customizable flow control.
     */
    pause(): void;

    /**
     * Resumes the pty for customizable flow control.
     */
    resume(): void;
}

/**
 * An object that can be disposed via a dispose function.
 */
export interface IDisposable {
    dispose(): void;
}

/**
 * An event that can be listened to.
 * @returns an `IDisposable` to stop listening.
 */
export interface IEvent<T> {
    (listener: (e: T) => any): IDisposable;
}

export type ArgvOrCommandLine = string[] | string;

class TauriPty implements IPty, IDisposable {
    pid: number;
    cols: number;
    rows: number;
    process: string;
    handleFlowControl: boolean;

    _exitted: boolean;

    private _onData = new EventEmitter2<string>();
    private _onExit = new EventEmitter2<{ exitCode: number; signal?: number | undefined; }>();

    constructor(file: string, args?: ArgvOrCommandLine, opt?: IWindowsPtyForkOptions) {
        args = typeof args === 'string' ? [args] : args ?? []; // Convert args to string[] anyways.
        const invokeArgs = {
            file, args,
            termName: opt?.name ?? 'Terminal',
            cols: opt?.cols ?? null,
            rows: opt?.rows ?? null,
            cwd: opt?.cwd ?? null,
            env: opt?.env ?? {},
            encoding: opt?.encoding ?? null,
            handleFlowControl: opt?.handleFlowControl ?? null,
            flowControlPause: opt?.flowControlPause ?? null,
            flowControlResume: opt?.flowControlResume ?? null,
        };
        invoke<number>('plugin:pty|spawn', invokeArgs).then(pid => {
            this._exitted = false;
            this.pid = pid;
            this.readData()
        });
    }
    dispose(): void {
        throw new Error("Method not implemented.");
    }

    public get onData(): IEvent<string> { return this._onData.event; }
    public get onExit(): IEvent<{ exitCode: number; signal?: number | undefined; }> { return this._onExit.event; }

    resize(columns: number, rows: number): void {
        this.cols = columns;
        this.rows = rows;
        invoke('plugin:pty|resize', { pid: this.pid, cols: columns, rows }).catch(e => {
            console.error('Resize error: ', e);
            this.errorCheck();
        });
    }
    clear(): void {
        throw new Error("Method not implemented.");
    }
    write(data: string): void {
        invoke('plugin:pty|write', { pid: this.pid, data }).catch(e => {
            console.error('Writing error: ', e);
            this.errorCheck();
        });
    }
    kill(signal?: string | undefined): void {
        throw new Error("Method not implemented.");
    }
    pause(): void {
        throw new Error("Method not implemented.");
    }
    resume(): void {
        throw new Error("Method not implemented.");
    }

    private async readData() {
        try {
            for (; ;) {
                const data = await invoke<string>('plugin:pty|read', { pid: this.pid });
                this._onData.fire(data);
            }
        } catch (e: any) {
            this.errorCheck();
            if (typeof e === 'string' && e.includes('EOF')) {
                return;
            }
            console.error('Reading error: ', e);
        }
    }

    private async errorCheck() {
        if (this._exitted) {
            return;
        }
        try {
            const exitCode = await invoke<number | null>('plugin:pty|exitstatus', { pid: this.pid })
            if (exitCode != null) {
                this._exitted = true;
                this._onExit.fire({ exitCode });
            }
        } catch (e: any) {
            console.error(e)
        }
    }
}
