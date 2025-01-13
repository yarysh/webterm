import { StdIO } from './stdio';


describe('StdIO init', () => {
    test ('success', () => {
        const buffer = new SharedArrayBuffer(8);
        const arr = new Uint16Array(buffer);

        new StdIO(arr);

        const dataView = new DataView(buffer);
        expect(dataView.getUint16(0, true)).toBe(0); // lock
        expect(dataView.getUint16(2, true)).toBe(3); // read position
        expect(dataView.getUint16(4, true)).toBe(3); // write position
        expect(dataView.getUint16(6, true)).toBe(0); // first character
    })

    test('throw error if array is too small', () => {
        const buffer = new SharedArrayBuffer(42);
        const arr = new Uint16Array(buffer, 0, 3);

        expect(() => new StdIO(arr)).toThrowError(/Array size should be between/);
    });

    test('throw error if array is too big', () => {
        const buffer = new SharedArrayBuffer(64*1024+2);
        const arr = new Uint16Array(buffer);

        expect(() => new StdIO(arr)).toThrowError(/Array size should be between/);
    });
});

describe('StdIO data write', () => {
    test('success', () => {
        const str = "Hello, world!❤️";

        const bufferSize = (3+str.length)*2; // lock, readPos, writePos, and str
        const buffer = new SharedArrayBuffer(bufferSize);
        const arr = new Uint16Array(buffer);

        new StdIO(arr).write(str);

        const dataView = new DataView(buffer);
        expect(dataView.getUint16(0, true)).toBe(0); // lock
        expect(dataView.getUint16(2, true)).toBe(3); // read position
        expect(dataView.getUint16(4, true)).toBe(3+str.length); // write position

        let gotStr = '';
        for (let i = 0; i < str.length; i++) {
            gotStr += String.fromCharCode(dataView.getUint16(6+i*2, true));
        }
        expect(gotStr).toBe(str);
    });
});
