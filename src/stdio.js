/**
 * TODO: check how concurrency works in js
*/
export class StdIO {
    /** @type {Uint16Array} */
    #arr;
    #locked = false;

    static #metaFields = {
        lock: 0,
        readPosition: 1,
        writePosition: 2,
    };

    /** @param {Uint16Array} arr */
    constructor(arr) {
        const minLength = Object.keys(StdIO.#metaFields).length + 1; // all metaFields + at least one character
        const maxLength = (64*1024) / arr.BYTES_PER_ELEMENT // 64KB of space for 32K elements
        if (arr.length < minLength || arr.length > maxLength) {
            throw new Error(`Array size should be between ${minLength} and ${maxLength}`);
        }

        this.#arr = arr;

        this.#lock();
        this.#arr[StdIO.#metaFields.readPosition] = Object.keys(StdIO.#metaFields).length;
        this.#arr[StdIO.#metaFields.writePosition] = Object.keys(StdIO.#metaFields).length;
        this.#unlock();
    }

    #lock() {
        if (this.#locked) {
            throw new Error('Lock already acquired');
        }

        while (true) {
            if (Atomics.load(this.#arr, StdIO.#metaFields.lock) === 0) {
                if (Atomics.add(this.#arr, StdIO.#metaFields.lock, 1) === 0) {
                    this.#locked = true;
                    return;
                } else {
                    Atomics.sub(this.#arr, StdIO.#metaFields.lock, 1)
                }
            }
        }
    }

    #unlock() {
        if (!this.#locked) {
            throw new Error('Lock not acquired');
        }
        while (Atomics.compareExchange(this.#arr, StdIO.#metaFields.lock, 1, 0) !== 1) {}
        this.#locked = false;
    }


    endian() {
        return ['BIG', 'LITTLE'][new Uint8Array(new Uint16Array([1]).buffer)[0]];
    }

    read() {
        throw new Error('Not implemented');
    }

    /** @param {string} data */
    write(data) {
        this.#lock();

        let writePos = this.#arr[StdIO.#metaFields.writePosition];

        const neededSpace = writePos + data.length;
        if (neededSpace > this.#arr.length) {
            // if not enough space, put data at the beginning of the buffer,
            // but not further than read position for preventing overwriting unread data
            const nextWritePos = Object.keys(StdIO.#metaFields).length + (neededSpace - this.#arr.length);
            if (nextWritePos > this.#arr[StdIO.#metaFields.readPosition]) {
                this.#unlock();
                throw new Error('Not enough space in buffer to write data');
            }
        }

        for (let i = 0; i < data.length; i++) {
            if (writePos >= this.#arr.length) {
                writePos = Object.keys(StdIO.#metaFields).length;
            }

            this.#arr[writePos] = data.charCodeAt(i);
            writePos++;
        }

        this.#arr[StdIO.#metaFields.writePosition] = writePos;

        this.#unlock();
    }
}
