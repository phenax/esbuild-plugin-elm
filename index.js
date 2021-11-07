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

/**
 * @param {string} pathToResolve
 */
const isDirectory = (pathToResolve) => fs.statSync(pathToResolve).isDirectory();

const getFiles = (path) => {
  const directoryEntries = fs.readdirSync(path);

  return directoryEntries.reduce((acc, entry) => {
    let filesToAdd = [];
    let directoriesToAdd = [];

    if (isDirectory(path + entry)) {
      const directoryPath = path + entry + '/';
      const resolvedEntries = getFiles(directoryPath);

      filesToAdd = resolvedEntries.files;
      directoriesToAdd = [directoryPath, ...resolvedEntries.directories];
    } else {
      filesToAdd = [path + entry];
    }

    return {
      directories: new Set([...acc.directories, ...directoriesToAdd]),
      files: new Set([...acc.files, ...filesToAdd]),
    }
  }, { directories: new Set([path]), files: new Set() });
};

const toBuildError = error => ({ text: error.message });

module.exports = ({ optimize = isProd(), debug, pathToElm: pathToElm_ } = {}) => ({
  name: 'elm',
  setup(build) {
    const [error, pathToElm] = pathToElm_ ? [null, pathToElm_] : getPathToElm();
    if (error) throw error;

    const compileOptions = {
      pathToElm,
      optimize,
      processOpts: { stdout: 'pipe' },
      debug,
    };

    build.onResolve({ filter: fileFilter }, args => {
      const resolvedPath = path.join(args.resolveDir, args.path)
      const fileParts = resolvedPath.split('/');
      const elmFilesPath = fileParts.slice(0, fileParts.length - 1).join('/') + '/';
      const resolvedFiles = getFiles(elmFilesPath);

      return ({
        path: path.join(args.resolveDir, args.path),
        namespace,
        watchDirs: [...resolvedFiles.directories],
        watchFiles: [...resolvedFiles.files]
      })
    })

    build.onLoad({ filter: /.*/, namespace }, async args => {
      try {
        const contents = elmCompiler.compileToStringSync([args.path], compileOptions);

        return { contents };
      } catch (e) {
        return { errors: [toBuildError(e)] };
      }
    });
  },
});
