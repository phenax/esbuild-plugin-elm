# Elm plugin for esbuild
An esbuild plugin for building elm projects

### Usage

A simple example config can be found in [./example](https://github.com/phenax/esbuild-plugin-elm/tree/main/example).

```js
esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/bundle.js',
  plugins: [
    ElmPlugin(options) // options are documented below
  ],
}).catch(e => (console.error(e), process.exit(1)))
```


### Options

* `optimize` *(optional)*
  Optimize the js output (true by default if `NODE_ENV` is production)

* `pathToElm` *(optional)*
  Specifiy an explicit path to the elm executable

