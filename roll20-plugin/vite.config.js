import path from 'path';
import postprocess from '@stadtlandnetz/rollup-plugin-postprocess';
import {defineConfig} from 'vite';

// eslint-disable-next-line max-lines-per-function
export default defineConfig(({command}) => ({
    base: '/lib',
    publicDir: path.join(__dirname, 'src', 'public'),
    plugins: [
        postprocess([
            [/import[^;]*/, '']
        ]),
    ],
    build: {
        emptyOutDir: true,
        outDir: 'lib/webpack-output',
        rollupOptions: {
            input: 'lib/index.js',
            external: ['roll20-ts'],
        },
        minify: false,
    },
    esbuild: {
        keepNames: true,
    },
}));
