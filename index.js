const path = require('path');
const fs = require('fs');
const elmCompiler = require('node-elm-compiler');
const cmdExists = require('command-exists').sync;

const namespace = 'elm';
const fileFilter = /\.elm$/;

const fileExists = p => fs.existsSync(p) && fs.statSync(p).isFile();

const isProd = () => process.env.NODE_ENV === 'production';

const getPathToElm = () => {
  if (fileExists('./node_modules/.bin/elm')) return [null, './node_modules/.bin/elm']
  if (cmdExists('elm')) return [null, 'elm'];
  return [new Error('Could not find `elm` executable. You can install it with `yarn add elm` or `npm install elm`'), null];
};

const toBuildError = error => ({ text: error.message });

module.exports = ({ optimize = isProd(), pathToElm: pathToElm_ } = {}) => ({
  name: 'elm',
  setup(build) {
    const [error, pathToElm] = pathToElm_ ? [null, pathToElm_] : getPathToElm();
    if (error) throw error;

    const compileOptions = {
      pathToElm,
      optimize,
      processOpts: { stdout: 'pipe' },
    };

    build.onResolve({ filter: fileFilter }, args => ({
      path: path.join(args.resolveDir, args.path),
      namespace,
    }))

    build.onLoad({ filter: /.*/, namespace }, async args => {
      try {
        const contents = await elmCompiler.compileToString([args.path], compileOptions);
        return { contents };
      } catch(e) {
        return { errors: [toBuildError(e)] };
      }
    });
  },
});

