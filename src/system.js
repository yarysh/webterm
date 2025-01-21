export class System {
    static #lastPid = -1;
    static #processes = {};

    static exec(cmd, args) {
        const pid = ++System.#lastPid;
        const process = new Process(pid, cmd, args);
        System.#processes[pid] = process;
        return process;
    }

    static abort(pid) {
        System.#processes[pid].stop();
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
