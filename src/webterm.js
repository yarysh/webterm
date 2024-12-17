'use strict';

import {Terminal} from '../node_modules/@xterm/xterm/lib/xterm.mjs';
import {FitAddon} from '../node_modules/@xterm/addon-fit/lib/addon-fit.mjs'


const KEY = {
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
}

export class Webterm {
    /** @type {Object} */
    #conf;
    /** @type {Terminal} */
    #xterm;

    /** @param {Object} conf */
    constructor(conf={}) {
        this.#conf = conf;
        this.#conf.prompt = this.#conf.prompt || '$ ';

        this.#xterm = new Terminal(this.#conf.xterm);
    };

    /** @param {HTMLElement} elem */
    init(elem) {
        this.#xterm.open(elem);

        const fitAddon = new FitAddon();
        this.#xterm.loadAddon(fitAddon);
        window.addEventListener('resize', () => fitAddon.fit());
        fitAddon.fit();

        this.#xterm.onData(this.#onData.bind(this));

        if (this.#conf.greeting && this.#conf.greeting.length) {
            this.#xterm.writeln(this.#conf.greeting);
        }
        this.#xterm.write(this.#conf.prompt);
        this.#xterm.focus();
    }

    /**
     * @param {IBuffer} buffer
     * @returns {string}
     */
    #content(buffer) {
        return buffer.getLine(buffer.cursorY).translateToString(true);
    }

    /** @param {string} data */
    #onData(data) {
        const buffer = this.#xterm.buffer.normal;
        const prompt = this.#conf.prompt;

        switch (data) {
            case KEY.ENTER:
                this.#xterm.write(`\r\n${prompt}`);
                break;

            case KEY.BACKSPACE:
                if (buffer.cursorX > prompt.length) this.#xterm.write('\b\x1B[P');
                break;

            case KEY.DEL:
                if (buffer.cursorX < this.#content(buffer).length) this.#xterm.write('\x1B[P');
                break;

            case KEY.CTRL_A:
                this.#xterm.write(`\x1B[${prompt.length+1}G`);
                break;

            case KEY.CTRL_C:
                this.#xterm.write(`^C\r\n${prompt}`);
                break;

            case KEY.CTRL_E:
                this.#xterm.write(`\x1B[${this.#content(buffer).length+1}G`);
                break;

            case KEY.CTRL_F:
            case KEY.R_ARROW:
                if (buffer.cursorX + 1 <= this.#content(buffer).length) this.#xterm.write(KEY.R_ARROW);
                break;

            case KEY.CTRL_B:
            case KEY.L_ARROW:
                if (buffer.cursorX - 1 >= prompt.length) this.#xterm.write(KEY.L_ARROW);
                break;

            default:
                if (data < " " || data > "~" && data < '\u00a0') break;

                const content = this.#content(buffer);
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
