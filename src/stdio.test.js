import { StdIO } from './stdio.js';


function testMetaFields(view, lock, readPos, writePos) {
    expect(view.getUint16(0, true)).toBe(lock);     // lock
    expect(view.getUint16(2, true)).toBe(readPos);  // read position
    expect(view.getUint16(4, true)).toBe(writePos); // write position
}

describe('StdIO init', () => {
    test ('success', () => {
        const buffer = new SharedArrayBuffer((3+1)*2); // all metaFields + 1 char (2B per character)
        const arr = new Uint16Array(buffer);

        new StdIO(arr);

        const view = new DataView(buffer);
        testMetaFields(view, 0, 3, 3);
        expect(view.getUint16(6, true)).toBe(0); // first character
    })

    test('error if array is too small', () => {
        const buffer = new SharedArrayBuffer(42);
        const arr = new Uint16Array(buffer, 0, 3);

        expect(() => new StdIO(arr)).toThrowError(/array size should be between/);
    });

    test('error if array is too big', () => {
        const buffer = new SharedArrayBuffer(64*1024+2);
        const arr = new Uint16Array(buffer);

        expect(() => new StdIO(arr)).toThrowError(/array size should be between/);
    });

    test('error if read position != 0', () => {
        const buffer = new SharedArrayBuffer((3+1)*2); // all metaFields + 1 char (2B per character)
        const arr = new Uint16Array(buffer);
        arr[1] = 1;

        expect(() => new StdIO(arr)).toThrowError('read position in initial array should be 0');
    });

    test('error if write position != 0', () => {
        const buffer = new SharedArrayBuffer((3+1)*2); // all metaFields + 1 char (2B per character)
        const arr = new Uint16Array(buffer);
        arr[2] = 1;

        expect(() => new StdIO(arr)).toThrowError('write position in initial array should be 0');
    });
});

describe('StdIO data read', () => {
    test('success when data written sequentially', () => {
        const str = "Hello, world!❤️";
        const buffer = new SharedArrayBuffer((3+str.length)*2); // all metaFields + str (2B per character)
        const arr = new Uint16Array(buffer);

        const view = new DataView(buffer);
        for (let i = 0; i < str.length; i++) {
            view.setUint16((3+i)*2, str.charCodeAt(i), true);
        }

        const stdio = new StdIO(arr)

        arr[2] += str.length+1; // move write position

        const got = stdio.read();
        expect(got).toBe(str);

        testMetaFields(view, 0, 3+str.length+1, 3+str.length+1);
    });

    test('success when part is written from the beginning', () => {
        const str = "orld!❤️-Hello, w";
        const buffer = new SharedArrayBuffer((3+str.length)*2); // all metaFields + str (2B per character)
        const arr = new Uint16Array(buffer);

        const view = new DataView(buffer);
        for (let i = 0; i < str.length; i++) {
            view.setUint16((3+i)*2, str.charCodeAt(i), true);
        }

        const stdio = new StdIO(arr);
        arr[1] += 8; // move read position
        arr[2] += 7; // move write position

        const got = stdio.read();
        const want = "Hello, world!❤️";
        expect(got).toBe(want);

        testMetaFields(view, 0, 3+7, 3+7);
    });

    test('success when nothing to read', () => {
        const buffer = new SharedArrayBuffer((3+1)*2); // all metaFields + 1 char (2B per character)
        const arr = new Uint16Array(buffer);

        const stdio = new StdIO(arr);

        const got = stdio.read();
        const want = '';
        expect(got).toBe(want);

        const view = new DataView(buffer);
        testMetaFields(view, 0, 3, 3);
    });

    test('success when everything has already been read, i.e read position == write position', () => {
        const str = "Hello, world!❤️";
        const buffer = new SharedArrayBuffer((3+str.length)*2); // all metaFields + str (2B per character)
        const arr = new Uint16Array(buffer);

        const view = new DataView(buffer);
        for (let i = 0; i < str.length; i++) {
            view.setUint16((3+i)*2, str.charCodeAt(i), true);
        }

        const stdio = new StdIO(arr);
        arr[1] += 7; // move read position
        arr[2] += 7; // move write position

        const got = stdio.read();
        const want = '';
        expect(got).toBe(want);

        testMetaFields(view, 0, 3+7, 3+7);
    });
});

describe('StdIO data write', () => {
    test('success when enough space', () => {
        const str = "Hello, world!❤️";
        const buffer = new SharedArrayBuffer((3+str.length)*2); // all metaFields + str (2B per character)
        const arr = new Uint16Array(buffer);

        new StdIO(arr).write(str);

        const view = new DataView(buffer);
        testMetaFields(view, 0, 3, 3+str.length);

        const got = new TextDecoder('utf-16').decode(view.buffer.slice(6))
        expect(got).toBe(str);
    });

    test('success when part is written from the beginning', () => {
        const str = "Hello, world!❤️";
        const buffer = new SharedArrayBuffer((3+str.length+1)*2); // all metaFields + str (2B per character) + 1 char as padding
        const arr = new Uint16Array(buffer);

        const stdio = new StdIO(arr);
        stdio.write("--------");
        arr[1] += 8; // move read position to the end of the written data
        stdio.write("Hello, world!❤️");

        const view = new DataView(buffer);
        testMetaFields(view, 0, 11, 3+7);

        const got = new TextDecoder('utf-16').decode(view.buffer.slice(6))
        const want = "orld!❤️-Hello, w";
        expect(got).toBe(want);
    });

    test('error when not enough space from the beginning', () => {
        const str = "Hello, world!❤️";
        const buffer = new SharedArrayBuffer((3+str.length)*2); // all metaFields + str (2B per character)
        const arr = new Uint16Array(buffer);

        const stdio = new StdIO(arr);
        stdio.write("-------");
        arr[1] += 7; // move read position to prevent writing from the beginning

        expect(() => stdio.write("Hello, world!❤️")).toThrowError("not enough space in buffer to write data");
    });

    test('error when not enough space for data', () => {
        const buffer = new SharedArrayBuffer(10);
        const arr = new Uint16Array(buffer);
        const stdio = new StdIO(arr);

        expect(() => stdio.write("Hello, world!❤️")).toThrowError("not enough space in buffer to write data");
    });
});
