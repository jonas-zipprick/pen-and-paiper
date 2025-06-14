import path from 'path';
import {defineConfig} from 'vite';

// eslint-disable-next-line max-lines-per-function
export default defineConfig(({command}) => ({
    base: '/lib',
    publicDir: path.join(__dirname, 'src', 'public'),
	server: {
        port: 3000,
    },
    build: {
        emptyOutDir: true,
        outDir: 'lib/webpack-output',
        rollupOptions: {
            input: 'lib/index.js',
        },
        minify: false,
    },
    esbuild: {
        keepNames: true,
    },
}));
