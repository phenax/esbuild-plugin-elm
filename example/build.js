const path = require('path');
const esbuild = require('esbuild');
const ElmPlugin = require('../index'); // require('esbuild-plugin-elm')

esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outdir: 'dist',
  plugins: [
    ElmPlugin(),
  ],
}).catch(_e => process.exit(1))
