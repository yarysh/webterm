import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
    server: {
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
        },
        open: '/demo/index.html',
    },
    build: {
        outDir: 'dist',
        emptyOutDir: false,
        lib: {
            entry: resolve(__dirname, 'src/webterm.js'),
            name: 'webterm',
            formats: ['es'],
        },
    },
    test: {
        globals: true,
        environment: 'node',
    },
});
