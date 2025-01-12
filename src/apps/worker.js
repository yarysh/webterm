export class Worker {
    /* @type {number} */
    #ppid;

    /* @type {string[]} */
    #args;

    /* @type {string} */
    #cmd;

    /* @type {number} */
    #pid;

    /* @type {Worker} */
    #process;

    /**
     *  @param {number} ppid
     *  @param {string} cmd
     *  @param {string[]} args
     */
    constructor(ppid, cmd, args) {
        this.#ppid = ppid;
        this.#cmd = cmd;
        this.#args = args;
    }

    /**
     *  @param {number} pid
     *  @returns Promise
     */
    exec(pid, fd) {
        this.#pid = pid;
        this.#process = new Worker(this.#cmd, {type: 'module'});
        this.#process.postMessage({'type': 'exec', 'args': this.#args});
        return new Promise((resolve) => {
            this.#process.onmessage = (event) => {
                if (event.data.type !== 'completed') return;
                this.#cleanup();
                resolve(event.data.status);
            };
        });
    }

    /**
     * @param {number} signal
     * @returns {number} status
     */
    exit(signal) {
        this.#cleanup();
        return -1;
    }

    #cleanup() {
        if (!this.#process) return;
        this.#process.terminate(); // just in case
        this.#process.onmessage = null;
        this.#process = null;
    }
}
