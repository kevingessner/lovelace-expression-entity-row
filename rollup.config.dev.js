import resolve from '@rollup/plugin-node-resolve';
import esbuild from 'rollup-plugin-esbuild';
import serve from 'rollup-plugin-serve';
import json from '@rollup/plugin-json';
import babel from '@rollup/plugin-babel';

const onwarn = (warning, warn) => {
  if (warning.code === 'THIS_IS_UNDEFINED' && warning.id?.includes('/node_modules/')) {
    return;
  }

  warn(warning);
};

export default {
  input: 'src/main.ts',
  output: {
    file: './dist/expression-entity-row.js',
    format: 'es',
  },
  plugins: [
    resolve(),
    esbuild({ target: 'es2022' }),
    json(),
    babel({
      exclude: 'node_modules/**',
      babelHelpers: 'bundled',
    }),
    serve({
      contentBase: './dist',
      host: '0.0.0.0',
      port: 5000,
      allowCrossOrigin: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }),
  ],
  watch: {
    include: 'src/**',
    exclude: 'node_modules/**',
    buildDelay: 500,
    chokidar: {
      usePolling: true,  // Required for reliable file detection on Docker volume mounts
      interval: 1000,
    },
  },
  onwarn,
};
