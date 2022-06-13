const path = require('path');
const fs = require('fs');
const elmCompiler = require('node-elm-compiler');
const cmdExists = require('command-exists').sync;

const namespace = 'elm';
const fileFilter = /\.elm$/;

const PURE_FUNCS = [ 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9']

const fileExists = p => fs.existsSync(p) && fs.statSync(p).isFile();

const getPathToElm = () => {
  if (fileExists('./node_modules/.bin/elm')) return './node_modules/.bin/elm'
  if (cmdExists('elm')) return 'elm'

  throw new Error('Could not find `elm` executable. You can install it with `yarn add elm` or `npm install elm`')
};

const toBuildError = error => ({ text: error.message });

module.exports = (config = {}) => ({
  name: 'elm',
  setup(build) {
    const isProd = process.env.NODE_ENV === 'production'

    const { optimize = isProd, cwd, debug, clearOnWatch } = config
    const pathToElm = config.pathToElm || getPathToElm();

    const options = build.initialOptions
    if (options.minify) {
      Object.assign(options, {
        pure: [ ...(options.pure || []), ...PURE_FUNCS ],
      })
    }

    const compileOptions = {
      pathToElm,
      optimize,
      processOpts: { stdout: 'pipe' },
      cwd,
      debug,
    };

    build.onResolve({ filter: fileFilter }, async (args) => {
      const resolvedPath = path.join(args.resolveDir, args.path)
      const resolvedDependencies = await elmCompiler.findAllDependencies(resolvedPath)

      return ({
        path: path.join(args.resolveDir, args.path),
        namespace,
        watchFiles: [resolvedPath, ...resolvedDependencies]
      })
    })

    build.onLoad({ filter: /.*/, namespace }, async args => {
      if (clearOnWatch) {
        console.clear();
      }

      try {
        const contents = elmCompiler.compileToStringSync([args.path], compileOptions);

        return { contents };
      } catch (e) {
        return { errors: [toBuildError(e)] };
      }
    });
  },
});
