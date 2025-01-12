import { StdIO } from './stdio';


describe('StdIO init', () => {
    test ('success', () => {
        const buffer = new ArrayBuffer(10);
        const dataView = new DataView(buffer);

        new StdIO(dataView);

        expect(dataView.getUint32(0, true)).toBe(8); // read position
        expect(dataView.getUint32(4, true)).toBe(8); // write position
        expect(dataView.getUint16(8, true)).toBe(0); // first character
    })

    test('throw error if view.byteLength < 10', () => {
        const dataView = new DataView(new ArrayBuffer(42), 0, 9);
        expect(() => new StdIO(dataView)).toThrowError(
            'DataView byte length should be between 10 and 4294967295'
        );
    });

    test('throw error if view.byteLength > uint32', () => {
        const dataView = new DataView(new ArrayBuffer(4294967296));
        expect(() => new StdIO(dataView)).toThrowError(
            'DataView byte length should be between 10 and 4294967295'
        );
    });
});

describe('StdIO data write', () => {
    test('success', () => {
        const str = "Hello, world!❤️";

        const bufferSize = 8+str.length*2; // 8 bytes for read/write position, 2 bytes for each character
        const buffer = new ArrayBuffer(bufferSize);
        const dataView = new DataView(buffer);

        new StdIO(dataView).write(str);

        expect(dataView.getUint32(0, true)).toBe(8); // read position
        expect(dataView.getUint32(4, true)).toBe(8+str.length*2); // write position

        let gotStr = '';
        for (let i = 0; i < str.length; i++) {
            gotStr += String.fromCharCode(dataView.getUint16(8+i*2, true));
        }
        expect(gotStr).toBe(str);
    });
});
