const path = require('path');
const elmCompiler = require('node-elm-compiler');
const cmdExists = require('command-exists').sync;

const namespace = 'elm';
const fileFilter = /\.elm$/;

const getPathToElm = () =>
  cmdExists('elm') ? 'elm' : './node_modules/.bin/elm';

module.exports = () => ({
  name: 'elm',
  setup(build) {
    const options = {
      pathToElm: getPathToElm(),
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

