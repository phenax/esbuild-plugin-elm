const path = require('path');
const elmCompiler = require('node-elm-compiler');

module.exports = () => ({
  name: 'elm',
  setup(build) {
    const fileFilter = /\.elm$/;
    const namespace = 'elm';
    const options = { pathToElm: './node_modules/.bin/elm' };

    build.onResolve({ filter: fileFilter }, args => ({
      path: path.join(args.resolveDir, args.path),
      namespace,
    }))

    build.onLoad({ filter: /.*/, namespace }, async (args) => {
      const contents = await elmCompiler.compileToString([args.path], options);
      return { contents };
    });
  },
});

