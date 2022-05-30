"use strict";

/**
 * @template ReturnType
 */
class FunctionWorker extends Worker {

    /**
     * @param {function(any): ReturnType} fun
     * @param {number} [id]
     */
    constructor(fun, id) {
        let workerOnmessage = FunctionWorker.workerOnmessage.toString();
        workerOnmessage = workerOnmessage.replace("customFunction", fun.toString());

        super(URL.createObjectURL(new Blob([
            "\"use strict\";\n\n",
            "const workerId = " + id + ";\n\n",
            "globalThis.onmessage = " + workerOnmessage + ";\n\n",
        ])));

        /** @type {number} */
        this._callCount = 0;
        /** @type {Map<number, HandyPromise>} */
        this._promises = new Map();

        this.onmessage = event => this.onMessageData(event.data);

        this._id = id;
    }

    get id() {
        return this._id;
    }

    /**
     * @param {any} args
     * @return {Promise<ReturnType>}
     */
    call(...args) {
        return this.callAndTransfer(args);
    }

    /**
     * @param {Array<any>} args
     * @param {Array<Transferable>} [transferables]
     * @return {Promise<ReturnType>}
     */
    callAndTransfer(args, transferables) {
        const callId = this._callCount++;

        const promise = new HandyPromise();
        this._promises.set(callId, promise);

        try {
            this.postMessage({callId: callId, args: args}, transferables);

        } catch (error) {
            console.error(error);
            this.onMessageData({callId: callId, success: false, result: error});
        }

        return promise;
    }

    /**
     * @param {{callId: number, success: boolean, result: any}} messageData
     */
    onMessageData(messageData) {
        const promise = this._promises.get(messageData.callId);
        this._promises.delete(messageData.callId);

        if (messageData.success)
            promise.resolve(messageData.result);
        else
            promise.reject(new Error("Function Worker Error"));
    }

    /**
     * this code will be executed in the worker
     * @param {MessageEvent} event
     */
    static workerOnmessage = async event => {
        /** @type {{callId: number, args: Array}} */
        const eventData = event.data;
        const callId = eventData.callId;
        const args = eventData.args;

        try {
            const transferables = [];

            const fun = customFunction;

            let result = fun(...args);
            while (result instanceof Promise)
                result = await result;

            globalThis.postMessage({callId: callId, success: true, result: result}, transferables);

        } catch (error) {
            console.error(error);
            globalThis.postMessage({callId: callId, success: false, result: error});
        }
    };

    terminate() {
        super.terminate();

        for (const promise of this._promises.values())
            promise.reject(new Error("Worker terminated"));
        this._promises.clear();
    }

}
