# esbuild-plugin-elm
An esbuild plugin for building elm projects

[![npm](https://img.shields.io/npm/v/esbuild-plugin-elm?color=%2351e980&style=flat-square)](https://www.npmjs.com/package/esbuild-plugin-elm)



### Install
Add this plugin to your project's dev-dependencies by running the following -

```
yarn add -D esbuild-plugin-elm
// OR
npm install -D esbuild-plugin-elm
```


### Usage

A simple example can be found in [./example](https://github.com/phenax/esbuild-plugin-elm/tree/main/example).

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

* `debug` *(default: `false`)*:

  Enable the time-travelling debugger

* `optimize` *(default: `NODE_ENV === 'production'`)*:

  Optimize the js output (true by default if `NODE_ENV` is production)

* `pathToElm` *(default: `node_modules/.bin/elm || elm`)*:

  Specify an explicit path to the elm executable

* `clearOnWatch` *(default: `false`)*:

  Clear the console before re-building on file changes

* `cwd` *(default: `<PWD>`)*:

  The current working directory/elm project root

* `verbose` *(default: `false`)*:

  Enable verbose output of `node-elm-compiler`


### Tutorials

* [How to Install Elm, on a Rails App, via esbuild, using `esbuild-plugin-elm`](https://benkoshy.github.io/2022/02/08/elm-via-esbuild-on-rails.html)
