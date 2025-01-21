/**
 * TODO: Add description for messaging
 */

let lastPid = -1;
const processes = {};

export class Process {
    //* @type {number} */
    #ppid;
    get ppid() {
        return this.#ppid;
    }

    //* @type {number} */
    #pid;
    get pid() {
        return this.#pid;
    }

    //* @type {string} */
    #cmd;
    get cmd() {
        return this.#cmd;
    }

    //* @type {string[]} */
    #args;
    get args() {
        return this.#args;
    }

    #process;

    /**
     *  @param {number|null} ppid
     *  @param {string} cmd
     *  @param {string[]} args
     */
    constructor(ppid, cmd, args) {
        this.#ppid = ppid;
        this.#cmd = cmd;
        this.#args = args;
    }

    _start() {
        this.#process = new Worker(this.cmd, {type: 'module'});

        this.#process.postMessage({'type': 'exec', 'args': this.args});

        return new Promise((resolve) => {
            this.#process.onmessage = (event) => {
                if (event.data.type !== 'completed') return;

                this.#cleanup();
                resolve(event.data.status);
            };
        });
    }

    _stop() {
        this.#cleanup();
    }

    #cleanup() {
        if (!this.#process) return;
        this.#process.terminate(); // just in case
        this.#process.onmessage = null;
        this.#process = null;
    }

    start() {
        this.#pid = ++lastPid;
        processes[this.#pid] = {
            'cmd': `${this.cmd} ${this.args.join(' ')}`.trim(),
            'ppid': this.ppid,
            'started': Date.now(),
        };

        try {
            return this._start();
        } catch (e) {
            delete processes[this.#pid];
            throw e;
        }
    }

    stop() {
        delete processes[this.#pid];
        this.#pid = null;
        this._stop();
    }
}
