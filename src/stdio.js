/**
 * TODO: check how concurrency works in js
*/
export class StdIO {
    static #offset = 8; // 4 bytes for read position, 4 bytes for write position

    #littleEndian = true;

    /** @type {DataView} */
    #view;

    get #readPos() {
        return this.#view.getUint32(0, this.#littleEndian);
    }
    /** @param {number} value */
    set #readPos(value) {
        this.#view.setUint32(0, value, this.#littleEndian);
    }

    get #writePos() {
        return this.#view.getUint32(4, this.#littleEndian);
    }
    /** @param {number} value */
    set #writePos(value) {
        this.#view.setUint32(4, value, this.#littleEndian);
    }

    /**
     * @param {DataView} view
     * @param {boolean} [littleEndian=true]
     * @throws {Error} if view.byteLength is greater than uint32
     * */
    constructor(view, littleEndian = true) {
        const minLength = 10; // 4 bytes for read position, 4 bytes for write position, 2 bytes for at least one character
        const maxLength = 4294967295; // Uint32 max value
        if (view.byteLength < minLength || view.byteLength > maxLength) {
            throw new Error(`DataView byte length should be between ${minLength} and ${maxLength}`);
        }

        this.#view = view;
        this.#littleEndian = littleEndian;

        this.#readPos = StdIO.#offset;
        this.#writePos = StdIO.#offset;
    }

    read() {
        throw new Error('Not implemented');
    }

    /**
     * @param {string} data
     * @throws {Error} if not enough space
     * */
    write(data) {
        const nextWritePos = this.#writePos + data.length*2; // 2 bytes per character

        // TODO: replace with circular buffer
        if (nextWritePos > this.#view.byteLength) {
            throw new Error('DataView byte length exceeded');
        }

        for (let i = 0; i < data.length; i++) {
            this.#view.setUint16(this.#writePos + i*2, data.charCodeAt(i), this.#littleEndian);
        }

        this.#writePos = nextWritePos;
    }
}
