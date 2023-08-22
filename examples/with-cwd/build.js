const esbuild = require('esbuild');
const ElmPlugin = require('esbuild-plugin-elm');

const watch = process.argv.includes('--watch')
const isProd = process.env.NODE_ENV === 'production'

esbuild.build({
  entryPoints: ['index.js'],
  bundle: true,
  outdir: 'dist',
  minify: isProd,
  watch,
  plugins: [
    ElmPlugin({
      optimize: isProd,
      cwd: 'elm',
      clearOnWatch: watch,
      verbose: true,
    }),
  ],
}).catch(_e => process.exit(1))
