const esbuild = require('esbuild');
const ElmPlugin = require('esbuild-plugin-elm');

const watch = process.argv.includes('--watch')
const isProd = process.env.NODE_ENV === 'production'

esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outdir: 'dist',
  minify: isProd,
  watch,
  plugins: [
    ElmPlugin({
      debug: true,
      optimize: isProd,
      clearOnWatch: watch,
    }),
  ],
}).catch(_e => process.exit(1))
