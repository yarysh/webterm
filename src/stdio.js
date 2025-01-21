export class StdIO {
    /** @type {Uint16Array} */
    #arr;
    #locked = false;

    static #metaFields = {
        lock: 0,
        readPosition: 1,
        writePosition: 2,
    };

    /**
     * @param {Uint16Array} arr
     * @throws {Error}
     */
    constructor(arr) {
        const metaFieldsCnt = Object.keys(StdIO.#metaFields).length;
        const minLength = metaFieldsCnt + 1; // all metaFields + at least one character
        const maxLength = (64*1024) / arr.BYTES_PER_ELEMENT // 64KB of space for 32K elements
        if (arr.length < minLength || arr.length > maxLength) {
            throw new Error(`array size should be between ${minLength} and ${maxLength}`);
        }

        this.#arr = arr;

        this.#lock();

        try {
            if (Atomics.compareExchange(this.#arr, StdIO.#metaFields.readPosition, 0, metaFieldsCnt) !== 0) {
                throw new Error('read position in initial array should be 0');
            }
            if (Atomics.compareExchange(this.#arr, StdIO.#metaFields.writePosition, 0, metaFieldsCnt) !== 0) {
                throw new Error('write position in initial array should be 0');
            }
        } finally {
            this.#unlock();
        }
    }

    /** @throws {Error} */
    #lock() {
        if (this.#locked) {
            throw new Error('lock already acquired');
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

    /** @throws {Error} */
    #unlock() {
        if (!this.#locked) {
            throw new Error('lock not acquired');
        }
        while (Atomics.compareExchange(this.#arr, StdIO.#metaFields.lock, 1, 0) !== 1) {}
        this.#locked = false;
    }

    /** @returns {string}
     *  @throws {Error}
     */
    read() {
        this.#lock();

        const readPos = this.#arr[StdIO.#metaFields.readPosition];
        const writePos = this.#arr[StdIO.#metaFields.writePosition];

        let data = '';

        // initial position or everything was read
        if (readPos === writePos) {
            this.#unlock();
            return data;
        }

        let parts;
        if (readPos < writePos) {
            // default case, when data is written sequentially
            parts = [[readPos, writePos]];
        } else {
            // part of the data is written from the beginning of the buffer
            parts = [[readPos, this.#arr.length], [Object.keys(StdIO.#metaFields).length, writePos]];
        }

        try {
            for (const [from, to] of parts) {
                data += new TextDecoder('utf-16').decode(this.#arr.slice(from, to));
            }
            this.#arr[StdIO.#metaFields.readPosition] = writePos;
        }
        finally {
            this.#unlock()
        }

        return data;
    }

    /** @param {string} data
     *  @throws {Error}
     */
    write(data) {
        const metaFieldsCnt = Object.keys(StdIO.#metaFields).length;

        this.#lock();

        let writePos = this.#arr[StdIO.#metaFields.writePosition];

        const neededSpace = writePos + data.length;
        if (neededSpace > this.#arr.length) {
            // if not enough space, put data at the beginning of the buffer,
            // but not further than read position - 1 for preventing overwriting unread data
            // and aligning write and read positions
            const nextWritePos = metaFieldsCnt + (neededSpace - this.#arr.length);
            if (nextWritePos > this.#arr[StdIO.#metaFields.readPosition]-1) {
                this.#unlock();
                throw new Error('not enough space in buffer to write data');
            }
        }

        for (let i = 0; i < data.length; i++) {
            if (writePos >= this.#arr.length) {
                writePos = metaFieldsCnt;
            }

            this.#arr[writePos] = data.charCodeAt(i);
            writePos++;
        }

        this.#arr[StdIO.#metaFields.writePosition] = writePos;

        this.#unlock();
    }
}
