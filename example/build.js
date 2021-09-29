const path = require('path');
const esbuild = require('esbuild');
const ElmPlugin = require('esbuild-plugin-elm');

esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outdir: 'dist',
  plugins: [
    ElmPlugin({ debug: true }),
  ],
}).catch(_e => process.exit(1))
