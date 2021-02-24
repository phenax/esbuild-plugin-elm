const path = require('path');
const fs = require('fs');
const elmCompiler = require('node-elm-compiler');
const cmdExists = require('command-exists').sync;

const namespace = 'elm';
const fileFilter = /\.elm$/;

const fileExists = p => fs.existsSync(p) && fs.statSync(p).isFile();

const getPathToElm = () => {
  if (fileExists('./node_modules/.bin/elm')) return [null, './node_modules/.bin/elm']
  if (cmdExists('elm')) return [null, 'elm'];
  return [new Error('Could not find `elm` executable. You can install it with `yarn add elm` or `npm install elm`'), null];
};

module.exports = () => ({
  name: 'elm',
  setup(build) {
    const [error, pathToElm] = getPathToElm();
    if (error) throw error;

    const options = {
      pathToElm,
    };

    build.onResolve({ filter: fileFilter }, args => ({
      path: path.join(args.resolveDir, args.path),
      namespace,
    }))

    build.onLoad({ filter: /.*/, namespace }, async args => {
      const contents = await elmCompiler.compileToString([args.path], options);
      return { contents };
    });
  },
});

