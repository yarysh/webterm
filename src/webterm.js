/**
 * TODO:
 * - check compatibility
 * - set interval instead of infinite loop
 */

import {Terminal} from '../node_modules/@xterm/xterm/lib/xterm.mjs';
import {FitAddon} from '../node_modules/@xterm/addon-fit/lib/addon-fit.mjs'

import {Process} from "./process.js";
import {Shell} from './shell.js';
import {Keyboard} from "./system.js";


export class Webterm extends Process {
    /** @type {Object} */
    #conf;

    /** @type {HTMLElement} */
    #container;

    /** @type {Terminal} */
    #xterm;

    /** @type {Shell} */
    #shell;

    /** @type {number} */
    #shellOffsetX;

    /**
     * @param {HTMLElement} container
     * @param {Object} conf
     */
    constructor(container, conf={}) {
        super(null, 'webterm', []);

        this.#container = container;
        this.#conf = conf;
        this.#xterm = new Terminal(this.#conf.xterm);
        this.#shell = new Shell(this.#conf.shell);
    };

    _start() {
        this.#xterm.open(this.#container);
        this.#xterm.onData(this.#onData.bind(this));

        const fitAddon = new FitAddon();
        this.#xterm.loadAddon(fitAddon);
        window.addEventListener('resize', () => fitAddon.fit());
        fitAddon.fit();

        this.#shell.onOutput(data => {
            this.#shellOffsetX = data.split('\n').pop().length;
            this.#xterm.write(data);
        });

        this.#shell.start();

        this.#xterm.focus();
    }

    _stop() {
        this.#shell.stop();
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
                const line = this.#getCurrentLine(buffer).substring(this.#shellOffsetX).trim();
                this.#xterm.write(`\r\n`);
                this.#shell.invoke(line);
                break;

            case Keyboard.BACKSPACE:
                if (buffer.cursorX > this.#shellOffsetX) this.#xterm.write('\b\x1B[P');
                break;

            case Keyboard.DEL:
                if (buffer.cursorX < this.#getCurrentLine(buffer).length) this.#xterm.write('\x1B[P');
                break;

            case Keyboard.CTRL_A:
                this.#xterm.write(`\x1B[${this.#shellOffsetX+1}G`);
                break;

            case Keyboard.CTRL_C:
                this.#xterm.write(`^C\r\n`);
                this.#shell.abort();
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
                if (buffer.cursorX - 1 >= this.#shellOffsetX) this.#xterm.write(Keyboard.L_ARROW);
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
