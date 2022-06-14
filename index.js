const path = require('path');
const fs = require('fs').promises;
const elmCompiler = require('node-elm-compiler');
const commandExists = require('command-exists');

const namespace = 'elm';
const fileFilter = /\.elm$/;

const getPathToElm = async () => {
  const commands = ['./node_modules/.bin/elm', 'elm'];
  const CMD_NOT_FOUND_ERR = 'Could not find `elm` executable. You can install it with `yarn add elm` or `npm install elm`';

  try {
    const command = await Promise.any(commands.map(command => commandExists(command)));

    return command;
  } catch (_) {
    throw new Error(CMD_NOT_FOUND_ERR);
  }
};

const toBuildError = error => ({ text: error.message });

const validateDependencies = async (fileCache, depsMap) => {
  const depStatus = await Promise.all([...depsMap].map(async ([depPath, cachedDep]) => {
    const newInput = await readFile(fileCache, depPath);

    if (cachedDep.input === newInput) {
      return true;
    }
    cachedDep.input = newInput;
    return false;
  }));

  return depStatus.every(isReady => isReady);
};

const checkCache = async (fileCache, cache, mainFilePath, compileOptions) => {
  const cached = cache.get(mainFilePath);
  const newInput = await readFile(fileCache, mainFilePath);

  const depsUnchanged = await validateDependencies(fileCache, cached.dependencies);

  if (depsUnchanged && cached.input === newInput) {
    return cached.output;
  }
  // https://github.com/phenax/esbuild-plugin-elm/issues/2
  const contents = elmCompiler.compileToStringSync([mainFilePath], compileOptions);
  const output = { contents };

  cache.set(mainFilePath, {
    input: newInput,
    output,
    dependencies: cached.dependencies,
  });

  return output;
};

const updateDependencies = (cache, resolvedPath, dependencyPaths) => {
  let cached = cache.get(resolvedPath)
    || { input: undefined, output: undefined, dependencies: new Map() };

  const newValue = depPath => cached.dependencies.get(depPath) || { input: undefined };
  const dependencies = new Map(dependencyPaths.map(depPath => [depPath, newValue(depPath)]));

  cache.set(resolvedPath, {
    ...cached,
    dependencies,
  });
};

const cachedElmCompiler = () => {
  const cache = new Map();

  const compileToStringSync = async (fileCache, inputPath, compileOptions) => {
    try {
      const output = await checkCache(fileCache, cache, inputPath, compileOptions);

      return output;
    } catch (e) {
      return { errors: [toBuildError(e)] };
    }
  };

  return { cache, compileToStringSync };
};


module.exports = (config = {}) => ({
  name: 'elm',
  async setup(build) {
    const isProd = process.env.NODE_ENV === 'production';

    const { optimize = isProd, debug, clearOnWatch } = config;
    const pathToElm = config.pathToElm || await getPathToElm();

    const compileOptions = {
      pathToElm,
      optimize,
      processOpts: { stdout: 'pipe' },
      debug,
    };

    const { cache, compileToStringSync } = cachedElmCompiler();

    const fileCache = new Map();
    build.onStart(() => {
      fileCache.clear();
    });

    build.onResolve({ filter: fileFilter }, async (args) => {
      const resolvedPath = path.join(args.resolveDir, args.path);
      const resolvedDependencies = await elmCompiler.findAllDependencies(resolvedPath);

      // I think we need to update deps on each resolve because you might
      // change your imports on every build
      updateDependencies(cache, resolvedPath, resolvedDependencies);

      return ({
        path: resolvedPath,
        namespace,
        watchFiles: [resolvedPath, ...resolvedDependencies],
      });
    });

    build.onLoad({ filter: /.*/, namespace }, async (args) => {
      if (clearOnWatch) {
        console.clear();
      }

      return compileToStringSync(fileCache, args.path, compileOptions);
    });
  },
});


const readFile = async (fileCache, filePath) => {
  let cached = fileCache.get(filePath);

  if (cached !== undefined) {
    return cached;
  } else {
    let fileContents = await fs.readFile(filePath, 'utf8');
    fileCache.set(filePath, fileContents);

    return fileContents
  }
}