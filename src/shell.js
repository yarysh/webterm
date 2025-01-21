import {Process} from "./process.js";


export class Shell extends Process {
    /** @type {Object} */
    #conf;

    /** @type {Array.<(string) => void>} */
    #outputListeners = [];

    /** @type {Process} */
    #runningProcess;

    /** @param {Object} conf */
    constructor(conf={}) {
        super(null, 'shell', []);

        this.#conf = conf;
        this.#conf.prompt = this.#conf.prompt || '$ ';
        this.#conf.commands = this.#conf.commands || {};
    }

    _start() {
        if (this.#conf.greeting && this.#conf.greeting.length) {
            this.#output(`${this.#conf.greeting}\r\n`);
        }
        this.#output(this.#conf.prompt);
    }

    _stop() {
        this.abort();
        this.#outputListeners = null;
    }

    /** @param {string} data */
    #output(data) {
        this.#outputListeners.forEach(fn => fn(data));
    }

    /** @param {function(string): void} callback */
    onOutput(callback) {
        this.#outputListeners.push(callback);
    }

    // TODO: test
    /** @param {string} line
     *  @returns {string[]}
     */
    #parseLine(line) {
        let args = [];
        line.trim().split(' ').forEach((part) => {
            if (part.length) args.push(part);
        });
        return args;
    }

    /** @param {string} line */
    async invoke(line) {
        const args = this.#parseLine(line);

        if (args.length === 0) {
            this.#output(this.#conf.prompt);
            return;
        }

        const cmd = args[0];
        const path = this.#conf.commands[cmd.toLowerCase()];
        if (!path) {
            this.#output(`shell: ${cmd}: command not found\r\n${this.#conf.prompt}`);
            return;
        }

        this.#runningProcess = new Process(this.pid, path, args);
        await this.#runningProcess.start();
        this.#runningProcess = null;

        this.#output(this.#conf.prompt);
    }

    abort() {
        if (this.#runningProcess) {
            this.#runningProcess.stop();
            this.#runningProcess = null;
        }

        this.#output(this.#conf.prompt);
    }
}
