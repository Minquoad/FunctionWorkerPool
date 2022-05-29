"use strict";

class HandyPromise extends Promise {
    /**
     * @param {Function} [executor]
     */
    constructor(executor) {
        let thisResolve;
        let thisReject;

        super((resolve, reject) => {
            thisResolve = resolve;
            thisReject = reject;

            executor?.(resolve, reject);
        });

        /** @type Function */
        this.resolve = thisResolve;
        /** @type Function */
        this.reject = thisReject;
    }
}
