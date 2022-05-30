"use strict";

/**
 * @template ReturnType
 */
class FunctionWorkerPool {

    /**
     * @param {function(any): ReturnType} fun
     * @param {number} [size]
     */
    constructor(fun, size) {
        /** @type {Set<FunctionWorker>} */
        this._availableWokers = new Set();
        /** @type {Set<FunctionWorker>} */
        this._unavailableWokers = new Set();
        /** @type {Set<HandyPromise>} */
        this._pendingPromises = new Set();

        /** @type {number} */
        this._size = size ?? navigator?.hardwareConcurrency ?? 12;

        for (let i = 0; i < this._size; i++)
            this._availableWokers.add(new FunctionWorker(fun, i));
    }

    /**
     * @return {number}
     */
    get size() {
        return this._size;
    }

    get availableWorkerCount() {
        return this._availableWokers.size;
    }

    /**
     * @return {Promise<FunctionWorker<ReturnType>>}
     */
    pickOne() {
        if (this._availableWokers.size !== 0) {
            const worker = MultiTool.popFirstOfSet(this._availableWokers);
            this._unavailableWokers.add(worker);
            return new Promise(resolve => resolve(worker));

        } else {
            const promise = new HandyPromise();
            this._pendingPromises.add(promise);
            return promise;
        }
    }

    /**
     * @param {FunctionWorker<ReturnType>} worker
     */
    giveBack(worker) {
        if (this._pendingPromises.size !== 0) {
            MultiTool.popFirstOfSet(this._pendingPromises).resolve(worker);

        } else {
            this._unavailableWokers.delete(worker);
            this._availableWokers.add(worker);
        }
    }

    /**
     * @param {any} args
     * @return {Promise<ReturnType>}
     */
    async call(...args) {
        const worker = await this.pickOne();
        const result = await worker.call(...args);
        this.giveBack(worker);
        return result;
    }

    /**
     * @param {Array<any>} args
     * @param {Array<Transferable>} [transferables]
     * @return {Promise<ReturnType>}
     */
    async callAndTransfer(args, transferables) {
        const worker = await this.pickOne();
        const result = await worker.callAndTransfer(args, transferables);
        this.giveBack(worker);
        return result;
    }

    terminate() {
        for (const worker of this._availableWokers)
            worker.terminate();
        for (const worker of this._unavailableWokers)
            worker.terminate();
    }

}
