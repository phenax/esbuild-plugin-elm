const path = require('path');
const fs = require('fs').promises;
const elmCompiler = require('node-elm-compiler');
const commandExists = require('command-exists');

const namespace = 'elm';
const fileFilter = /\.elm$/;

const fileExists = filePath => fs.stat(filePath).then(stat => stat.isFile()).catch(() => false);

const getPathToElm = async () => {
  let [fileDoesExist, commandDoesExist] = await Promise.all([fileExists('./node_modules/.bin/elm'), commandExists('elm')]);
  if (fileDoesExist) return './node_modules/.bin/elm';
  if (commandDoesExist) return 'elm';

  throw new Error('Could not find `elm` executable. You can install it with `yarn add elm` or `npm install elm`');
};

const toBuildError = error => ({ text: error.message });

const validateDependencies = async depsMap => {
  const depStatus = await Promise.all([...depsMap].map(async ([depPath, cachedDep]) => {
    const newInput = await fs.readFile(depPath, 'utf8');

    if (cachedDep.input === newInput) {
      return true;
    }
    cachedDep.input = newInput;
    return false;
  }));

  return depStatus.every(isReady => isReady);
};

const checkCache = async (cache, mainFilePath, compileOptions) => {
  const cached = cache.get(mainFilePath);
  const newInput = await fs.readFile(mainFilePath, 'utf8');

  const depsUnchanged = await validateDependencies(cached.dependencies);

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

  const compileToStringSync = async (inputPath, compileOptions) => {
    try {
      const output = await checkCache(cache, inputPath, compileOptions);

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

      return compileToStringSync(args.path, compileOptions);
    });
  },
});
