const path = require('path');
const fs = require('fs').promises;
const elmCompiler = require('node-elm-compiler');
const commandExists_ = require('command-exists');

const namespace = 'elm';
const fileFilter = /\.elm$/;

const PURE_FUNCS = [ 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9']

// Like command-exists' function but returns undefined when the command is missing,
// instead of throwing an error.
const commandExists = path =>
  commandExists_(path).catch(_ => undefined);

const getPathToElm = async () => {
  const commands = [path.resolve('./node_modules/.bin/elm'), 'elm'];
  const CMD_NOT_FOUND_ERR = 'Could not find `elm` executable. You can install it with `yarn add elm` or `npm install elm`';

  const foundCommands = await Promise.all(commands.map(commandExists));

  const elmCommand = foundCommands.find(cmd => cmd !== undefined);

  if (elmCommand) {
    return elmCommand;
  } else {
    throw new Error(CMD_NOT_FOUND_ERR);
  }
}


// Cached version of `fs.stat`.
// Cache is cleared on each build.
const readFileModificationTime = async (fileCache, filePath) => {
  const cached = fileCache.get(filePath);

  if (cached !== undefined) {
    return cached;
  }
  const stat = await fs.stat(filePath);
  const fileContents = stat.mtimeMs;

  fileCache.set(filePath, fileContents);

  return fileContents;
};

const toBuildError = error => ({ text: error.message });

// Checks whether all deps for a "main" elm file are unchanged.
// These only include source deps (might need to reset the dev server if you add an extra dep).
// If not, we need to recompile the file importing them.
const validateDependencies = async (fileCache, depsMap) => {
  const depStatus = await Promise.all([...depsMap].map(async ([depPath, cachedDep]) => {
    const newInput = await readFileModificationTime(fileCache, depPath);

    if (cachedDep.input === newInput) {
      return true;
    }
    cachedDep.input = newInput;
    return false;
  }));

  return depStatus.every(isReady => isReady);
};

// Cached version of `elmCompiler.compileToStringSync`
// Cache is persisted across builds
const checkCache = async (fileCache, cache, mainFilePath, compileOptions) => {
  const cached = cache.get(mainFilePath);
  const newInput = await readFileModificationTime(fileCache, mainFilePath);

  const depsUnchanged = await validateDependencies(fileCache, cached.dependencies);

  if (depsUnchanged && cached.input === newInput) {
    return cached.output;
  }
  // Can't use the async version:
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

// Recompute dependencies but keep cached artifacts if we had them
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

    const { optimize = isProd, cwd, debug, verbose, clearOnWatch } = config
    const pathToElm = config.pathToElm || await getPathToElm();

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
      verbose,
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
        // eslint-disable-next-line no-console
        console.clear();
      }

      return compileToStringSync(fileCache, args.path, compileOptions);
    });
  },
});
