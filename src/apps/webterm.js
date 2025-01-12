import {Terminal} from '../../node_modules/@xterm/xterm/lib/xterm.mjs';
import {FitAddon} from '../../node_modules/@xterm/addon-fit/lib/addon-fit.mjs'

import {
    BaseProcess,
    Keyboard,
    System,
} from "../system.js";


/**
 * @typedef WebtermArgs
 * @type {Object.<{container: HTMLElement, conf: Object.<{shell: Object, xterm: Object}>}>}
 */

export class Webterm extends BaseProcess{
    /** @type {Object} */
    #conf;

    /** @type {HTMLElement} */
    #container;

    /** @type {Terminal} */
    #xterm;

    /** @type {Object.<{pid: number, stdIn: StdIO, stdOut: StdIO, stdErr: StdIO, offsetX: number}>} */
    #shell;

    /** @type {Disposable} */ 
    #onDataDisposable

    /** @type {Function} */
    #onExecResolve;

    /**
     * @param {number} ppid
     * @param {WebtermArgs} args
     */
    constructor(ppid, args) {
        super(ppid,args);

        this.#container = args.container;
        this.#conf = args.conf;
        this.#xterm = new Terminal(this.#conf.xterm);
    };

    /**
     * @param {number} pid
     * @param {StdIOs} stdIOs
     * @returns Promise
     */
    exec(pid, stdIOs) {
        super.exec(pid, stdIOs);

        this.#xterm.open(this.#container);
        this.#onDataDisposable = this.#xterm.onData(this.#onData.bind(this));

        const fitAddon = new FitAddon();
        this.#xterm.loadAddon(fitAddon);
        window.addEventListener('resize', () => fitAddon.fit());
        fitAddon.fit();

        let shellPid, shellIO;
        try {
            [shellPid, shellIO] = System.process.fork(pid, "shell", this.#conf.shell);
        } catch (e) {
            this.#xterm.write("failed to initialize shell\r\n")
            console.error(e);
            return Promise.reject(e);
        }
        this.#shell = {pid: shellPid, stdIn: shellIO[0], stdOut: shellIO[1], stdErr: shellIO[2]}
        this.#shell.stdOut.onData(() => {
            const data = this.#shell.stdOut.read();
            this.#shell.offsetX = data.split('\n').pop().length;
            this.#xterm.write(data);
        });

        try {
            System.process.exec(shellPid).then(() => {
                this.#xterm.write("[Process completed]\r\n");
                this.exit(System.SIGNAL.SIGTERM);
            })
        } catch (e) {
            this.#xterm.write("failed to start shell\r\n")
            console.error(e);
            return Promise.reject(e);
        }

        this.#xterm.focus();

        return new Promise((resolve) => {
            this.#onExecResolve = resolve;
        });
    }

    /**
     * @param {number} signal
     * @throws {Error}
     * @returns {number} status
     */
    exit(signal) {
        super.exit(signal);

        this.#onDataDisposable.dispose();
        [this.#shell, this.#xterm] = [null, null];
        this.#onExecResolve(signal);
        return System.EXIT_CODE.SUCCESS;
    }

    /**
     * @param {IBuffer} buffer
     * @returns {string}
     */
    #getCurrentLine(buffer) {
        return buffer.getLine(buffer.cursorY).translateToString(true);
    }

    /** @param {string} data */
    #onData(data) {
        const buffer = this.#xterm.buffer.normal;

        switch (data) {
            case Keyboard.ENTER:
                const line = this.#getCurrentLine(buffer).substring(this.#shell.offsetX).trim();
                this.#xterm.write(`\r\n`);
                this.#shell.stdIn.write(line);
                break;

            case Keyboard.BACKSPACE:
                if (buffer.cursorX > this.#shell.offsetX) this.#xterm.write('\b\x1B[P');
                break;

            case Keyboard.DEL:
                if (buffer.cursorX < this.#getCurrentLine(buffer).length) this.#xterm.write('\x1B[P');
                break;

            case Keyboard.CTRL_A:
                this.#xterm.write(`\x1B[${this.#shell.offsetX+1}G`);
                break;

            case Keyboard.CTRL_C:
                this.#xterm.write(`^C\r\n`);
                this.#shell.stdIn.write(Keyboard.CTRL_C);
                break;

            case Keyboard.CTRL_E:
                this.#xterm.write(`\x1B[${this.#getCurrentLine(buffer).length+1}G`);
                break;

            case Keyboard.CTRL_F:
            case Keyboard.R_ARROW:
                if (buffer.cursorX + 1 <= this.#getCurrentLine(buffer).length) this.#xterm.write(Keyboard.R_ARROW);
                break;

            case Keyboard.CTRL_B:
            case Keyboard.L_ARROW:
                if (buffer.cursorX - 1 >= this.#shell.offsetX) this.#xterm.write(Keyboard.L_ARROW);
                break;

            default:
                if (data < " " || data > "~" && data < '\u00a0') break;

                const content = this.#getCurrentLine(buffer);
                const cursor = buffer.cursorX;

                if (cursor === content.length) {
                    // Insert at the end of the line
                    this.#xterm.write(data);
                } else {
                    // Insert in the middle of the line
                    this.#xterm.write(
                        `\x1B[$0K${data}${content.substring(cursor)}\x1B[${(cursor+data.length+1)}G`
                    );
                }
                break;
        }
    }
}
