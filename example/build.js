const esbuild = require('esbuild');
const ElmPlugin = require('../index'); // require('esbuild-plugin-elm')

esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/bundle.js',
  plugins: [
    ElmPlugin()
  ],
}).catch(e => (console.error(e), process.exit(1)))
