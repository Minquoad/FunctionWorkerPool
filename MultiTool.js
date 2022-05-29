"use strict";

class MultiTool {

    /**
     * @template T
     * @param {Set<T>} set
     * @return {T}
     */
    static popFirstOfSet(set) {
        const first = set.values().next().value;
        set.delete(first);
        return first;
    }

}
