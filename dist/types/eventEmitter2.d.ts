import { IDisposable } from ".";
export interface IEvent<T> {
    (listener: (e: T) => any): IDisposable;
}
export declare class EventEmitter2<T> {
    private _listeners;
    private _event?;
    get event(): IEvent<T>;
    fire(data: T): void;
}
