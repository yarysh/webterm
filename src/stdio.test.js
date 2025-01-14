import { StdIO } from './stdio';


describe('StdIO init', () => {
    test ('success', () => {
        const buffer = new SharedArrayBuffer((3+1)*2); // all metaFields + 1 char (2B per character)
        const arr = new Uint16Array(buffer);

        new StdIO(arr);

        const dataView = new DataView(buffer);
        expect(dataView.getUint16(0, true)).toBe(0); // lock
        expect(dataView.getUint16(2, true)).toBe(3); // read position
        expect(dataView.getUint16(4, true)).toBe(3); // write position
        expect(dataView.getUint16(6, true)).toBe(0); // first character
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

describe('StdIO data write', () => {
    test('success when enough space', () => {
        const str = "Hello, world!❤️";
        const buffer = new SharedArrayBuffer((3+str.length)*2); // all metaFields + str (2B per character)
        const arr = new Uint16Array(buffer);

        new StdIO(arr).write(str);

        const dataView = new DataView(buffer);
        expect(dataView.getUint16(0, true)).toBe(0); // lock
        expect(dataView.getUint16(2, true)).toBe(3); // read position
        expect(dataView.getUint16(4, true)).toBe(3+str.length); // write position

        let got = '';
        for (let i = 0; i < str.length; i++) {
            got += String.fromCharCode(dataView.getUint16(3*2+i*2, true));
        }

        expect(got).toBe(str);
    });

    test('success when part is written from the beginning', () => {
        const str = "Hello, world!❤️";
        const buffer = new SharedArrayBuffer((3+str.length)*2); // all metaFields + str (2B per character)
        const arr = new Uint16Array(buffer);

        const stdio = new StdIO(arr);
        stdio.write("-------");
        arr[1] += 7; // move read position to the end of the written data
        stdio.write("Hello, world!❤️");

        const dataView = new DataView(buffer);
        expect(dataView.getUint16(0, true)).toBe(0); // lock
        expect(dataView.getUint16(2, true)).toBe(10); // read position
        expect(dataView.getUint16(4, true)).toBe(3+7); // write position

        let got = '';
        for (let i = 0; i < str.length; i++) {
            got += String.fromCharCode(dataView.getUint16(6+i*2, true));
        }
        const want = "orld!❤️Hello, w";

        expect(got).toBe(want);
    });

    test('error when not enough space from the beginning', () => {
        const str = "Hello, world!❤️";
        const buffer = new SharedArrayBuffer((3+str.length)*2); // all metaFields + str (2B per character)
        const arr = new Uint16Array(buffer);

        const stdio = new StdIO(arr);
        stdio.write("-------");
        arr[1] += 6; // move read position to prevent writing from the beginning

        expect(() => stdio.write("Hello, world!❤️")).toThrowError("not enough space in buffer to write data");
    });

    test('error when not enough space for data', () => {
        const buffer = new SharedArrayBuffer(10);
        const arr = new Uint16Array(buffer);
        const stdio = new StdIO(arr);

        expect(() => stdio.write("Hello, world!❤️")).toThrowError("not enough space in buffer to write data");
    });
});

describe('StdIO data read', () => {
    test('success when data written sequentially', () => {
        const str = "Hello, world!❤️";
        const buffer = new SharedArrayBuffer((3+str.length)*2); // all metaFields + str (2B per character)
        const arr = new Uint16Array(buffer);

        const dataView = new DataView(buffer);
        for (let i = 0; i < str.length; i++) {
            dataView.setUint16((3+i)*2, str.charCodeAt(i), true);
        }

        new StdIO(arr);

        const got = new StdIO(arr).read();

        expect(got).toBe(str);
    });

    test('success when part is written from the beginning', () => {
        const str = "orld!❤️Hello, w";
        const buffer = new SharedArrayBuffer((3+str.length)*2); // all metaFields + str (2B per character)
        const arr = new Uint16Array(buffer);

        const dataView = new DataView(buffer);
        for (let i = 0; i < str.length; i++) {
            dataView.setUint16((3+i)*2, str.charCodeAt(i), true);
        }

        new StdIO(arr);
        arr[1] += 7; // move read position
        arr[2] = 10; // move write position

        const got = new StdIO(arr).read();
        const want = "Hello, world!❤️";

        expect(got).toBe(want);
    });

    test('success when nothing to read', () => {
        const buffer = new SharedArrayBuffer((3+1)*2); // all metaFields + 1 char (2B per character)
        const arr = new Uint16Array(buffer);

        new StdIO(arr);

        const got = new StdIO(arr).read();
        const want = '';

        expect(got).toBe(want);
    });

    test('success when everything has already been read, i.e read position == write position', () => {
        const str = "Hello, world!❤️";
        const buffer = new SharedArrayBuffer((3+str.length)*2); // all metaFields + str (2B per character)
        const arr = new Uint16Array(buffer);

        const dataView = new DataView(buffer);
        for (let i = 0; i < str.length; i++) {
            dataView.setUint16((3+i)*2, str.charCodeAt(i), true);
        }

        new StdIO(arr);
        arr[1] += 7; // move read position
        arr[2] += 7; // move write position

        const got = new StdIO(arr).read();
        const want = '';

        expect(got).toBe(want);
    });
});
