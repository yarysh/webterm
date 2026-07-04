import {BaseProcess, System} from "../system.js";

export class Command extends BaseProcess {
    /* @type {number} */
    #ppid;

    /* @type {string[]} */
    #args;

    /* @type {string} */
    #cmd;

    /* @type {number} */
    #pid;

    /* @type {Command} */
    #process;

    /**
     *  @param {number} ppid
     *  @param {string[]} args
     */
    constructor(ppid, args) {
        super(ppid, args);

        this.#ppid = ppid;
        this.#cmd = args[0];
        console.log("Command args:", args, Array.isArray(args));

        this.#args = args.slice(1);
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
