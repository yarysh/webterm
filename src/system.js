import {StdIO} from "./stdio.js";


/**
 * @typedef StdIOs
 * @type {[StdIO, StdIO, StdIO]} - stdin, stdout, stderr
 */

/**
 * @typedef ProcessRegisterObject
 * @type {Object.<{ppid: number, process: BaseProcess, stdIOs: StdIOs, initiated: number, started: number}>}
 */

export class BaseProcess {
    /** @type {number} */
    #ppid;
    get ppid() {
        return this.#ppid;
    }

    /** @type {number} */
    #pid;
    get pid() {
        return this.#pid;
    }
    
    /** @type {StdIO} */
    #stdin;
    get stdin() {
        return this.#stdin;
    }

    /** @type {StdIO} */
    #stdout;
    get stdout() {
        return this.#stdout;
    }

    /** @type {StdIO} */
    #stderr;
    get stderr() {
        return this.#stderr;
    }

    /**
     * @param {number} ppid - parent process id
     * @param {Object} args
     */
    constructor(ppid, args) {
        this.#ppid = ppid;
    }

    /**
     * @param {number} pid
     * @param {StdIOs} stdIOs
     * @returns Promise
     */
    exec(pid, stdIOs) {
        this.#pid = pid;
        [this.#stdin, this.#stdout, this.#stderr] = stdIOs;
        return Promise.resolve();
    }

    /**
     * @param {number} signal
     * @returns {number} status
     */
    exit(signal) {
        [this.#stdin, this.#stdout, this.#stderr] = [null, null, null];
    }
}

export const Keyboard = {
    BACKSPACE: '\u007F',
    CTRL_A:    '\u0001',
    CTRL_B:    '\u0002',
    CTRL_C:    '\u0003',
    CTRL_E:    '\u0005',
    CTRL_F:    '\u0006',
    DEL:       '\u001b[3~',
    ENTER:     '\r',
    L_ARROW:   '\u001b[D',
    R_ARROW:   '\u001b[C',
};

export const System = {
    PATH: {},
    PROCESS_BUFFER_BYTES: 3*1024, //3KB
    EXIT_CODE: {
        SUCCESS: 0,
        GEN_ERR: 1,
        MISUSE: 2,
        NOT_EXEC: 126,
        NOT_FOUND: 127,
        INVAL_ARG: 128,
        TERM_SIGINT: 130,
        TERM_SIGKILL: 137,
        TERM_SIGTERM: 143,
        OUT_OF_RANGE: 255,
    },
    SIGNAL: {
        SIGINT: 2,
        SIGKILL: 9,
        SIGTERM: 15,
    },
    process: {
        /**
         *  @param {number} ppid
         *  @param {string} cmd
         *  @param {Object} args
         *  @throws {Error}
         *  @returns {[number, StdIOs]}
         */
        fork: function (ppid, cmd, args) {
            const app = System.PATH[cmd];
            if (app == null) {
                throw new Error(`${cmd}: command not found`);
            }
            return ProcessRegister.register({
                ppid: ppid,
                process: new app(ppid, args),
                stdIOs: initStdIOs(),
                initiated: Date.now(),
            })
        },

        /**
         *  @param {number} pid
         *  @throws {Error}
         *  @returns {Promise}
         */
        exec: function (pid) {
            const obj = ProcessRegister.get(pid)
            if (obj == null) {
                throw new Error(`${pid}: process not found`);
            }
            obj.started = Date.now();
            try {
                return new Promise((resolve) => {
                    obj.process.exec(pid, obj.stdIOs).then((signal) => {
                        ProcessRegister.deregister(pid);
                        resolve(signal);
                    })
                })
            } catch (e) {
                ProcessRegister.deregister(pid);
                throw e;
            }
        },

        /**
         *  @param {number} pid
         *  @param {number} signal
         *  @throws {Error}
         *  @returns {number} status
         */
        exit: function (pid, signal) {
            const obj = ProcessRegister.get(pid)
            if (obj == null) {
                throw new Error(`process ${pid} not found`);
            }
            let status = -1;
            try {
                status = obj.process.exit(signal);
                ProcessRegister.deregister(pid)
            } catch (e) {
                throw e;
            }
            return status;
        },
    }
}

/**
 * @throws {Error}
 * @returns {StdIOs}
 */
function initStdIOs() {
    // Initialize a buffer that will be used for stdin, stdout and stderr
    // First third of the buffer will be used for stdin
    // Second third for stdout
    // Last third for stderr
    const buffer = new ArrayBuffer(System.PROCESS_BUFFER_BYTES)
    let oneThird = Math.floor(
        (Math.floor(buffer.byteLength/3) / Uint16Array.BYTES_PER_ELEMENT)
    ) * Uint16Array.BYTES_PER_ELEMENT;
    const length = oneThird/Uint16Array.BYTES_PER_ELEMENT
    const stdin = new StdIO(new Uint16Array(buffer, 0, length))
    const stdout = new StdIO(new Uint16Array(buffer, oneThird, length))
    const stderr = new StdIO(new Uint16Array(buffer, oneThird*2, length))
    return [stdin, stdout, stderr];
}

class ProcessRegister {
    /** @type {number} */
    static #lastPid = -1;

    /**
     * @type {Object.<number, ProcessRegisterObject>}
     */
    static #objects = {};

    /**
     * @param {number} pid
     * @returns {ProcessRegisterObject|undefined}
     */
    static get(pid) {
        return this.#objects[pid];
    }

    /**
     * @param {ProcessRegisterObject} obj
     * @returns {[number, StdIOs]}
     */
    static register(obj) {
        const pid = ++this.#lastPid;
        this.#objects[pid] = obj;
        return [pid, obj.stdIOs];
    }

    /**
     * @param {number} pid
     * @returns {void}
     */
    static deregister(pid) {
        this.#objects[pid] = null;
    }
}
