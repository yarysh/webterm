import {BaseProcess, System} from "../system.js";


/**
 * @typedef ShellArgs
 * @type {Object.<{greeting: string, prompt: string}>}
 */

export class Shell extends BaseProcess {
    /** @type {Object} */
    #conf;
    
    /** @type {Function} */
    #onExecResolve;

    /**
     * @param {number} ppid
     * @param {ShellArgs} args
     */
    constructor(ppid, args) {
        super(ppid, args);

        this.#conf = args;
        this.#conf.prompt = this.#conf.prompt || '$ ';
    }

    /**
     * @param {number} pid
     * @param {StdIOs} stdIOs
     * @returns Promise
     */
    exec(pid, stdIOs) {
        super.exec(pid, stdIOs);

        this.stdin.onData(() => {
            const line = this.stdin.read();
            this.invoke(line);
        })

        if (this.#conf.greeting && this.#conf.greeting.length) {
            this.stdout.write(`${this.#conf.greeting}\r\n`);
        }
        this.stdout.write(this.#conf.prompt);

        return new Promise((resolve) => {
            this.#onExecResolve = resolve;
        });
    }

    /**
     * @param {number} signal
     * @returns {number} status
     */
    exit(signal) {
        super.exit(signal);

        this.#onExecResolve(signal);
        return System.EXIT_CODE.SUCCESS;
    }

    /**
     * TODO - test 
     * @param {string} line
     * @returns {Array.<string>}
     */
    #parseLine(line) {
        line = line.replaceAll("$$", this.pid.toString())

        let args = [];
        line.trim().split(' ').forEach((part) => {
            if (part.length) args.push(part);
        });
        return args;
    }

    /** 
     * @param {string} line
     * @returns {void}
     */
    invoke(line) {
        const args = this.#parseLine(line);

        if (args.length === 0) {
            this.stdout.write(this.#conf.prompt);
            return;
        }

        const cmd = args[0];
        switch (cmd) {
            case "exit": {
                this.exit(System.SIGNAL.SIGTERM);
                return;
            }
        }

        this.stdout.write(`shell: ${cmd}: command not found\r\n${this.#conf.prompt}`);
    }

    abort() {
        this.stdout.write(this.#conf.prompt);
    }
}
