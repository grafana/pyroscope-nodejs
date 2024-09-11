/**
 * Copyright 2024 Datadog Inc. All Rights Reserved.
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Originally copied from cloud-debug-nodejs's sourcemapper.ts from
// https://github.com/googleapis/cloud-debug-nodejs/blob/7bdc2f1f62a3b45b7b53ea79f9444c8ed50e138b/src/agent/io/sourcemapper.ts
// Modified to map from generated code to source code, rather than from source
// code to generated code.

import * as fs from 'fs';
import * as path from 'path';
import * as sourceMap from 'source-map';
import { logger } from './logger.js';
import pLimit from 'p-limit';

const readFile = fs.promises.readFile;

const CONCURRENCY = 10;
const MAP_EXT = '.map';

function error(msg: string) {
  logger.debug(`Error: ${msg}`);
  return new Error(msg);
}

export interface MapInfoCompiled {
  mapFileDir: string;
  mapConsumer: sourceMap.RawSourceMap;
}

export interface GeneratedLocation {
  file: string;
  name?: string;
  line: number;
  column: number;
}

export interface SourceLocation {
  file?: string;
  name?: string;
  line?: number;
  column?: number;
}

/**
 * @param {!Map} infoMap The map that maps input source files to
 *  SourceMapConsumer objects that are used to calculate mapping information
 * @param {string} mapPath The path to the source map file to process.  The
 *  path should be relative to the process's current working directory
 * @private
 */
async function processSourceMap(
  infoMap: Map<string, MapInfoCompiled>,
  mapPath: string,
  debug: boolean
): Promise<void> {
  // this handles the case when the path is undefined, null, or
  // the empty string
  if (!mapPath) {
    throw error(`The path "${mapPath}" does not specify a source map file`);
  }
  mapPath = path.normalize(mapPath);

  let contents;
  try {
    contents = await readFile(mapPath, 'utf8');
  } catch (e) {
    throw error('Could not read source map file ' + mapPath + ': ' + e);
  }

  // if map path doesn't end with .map
  if (!mapPath.endsWith(MAP_EXT)) {
    // with regex find line that starts with "//# sourceMappingURL=data:application/json;base64"
    // and extract base64 string
    const base64Match = contents.match(
      /\/\/# sourceMappingURL=data:application\/json;base64,([^ ]*)/
    );
    if (base64Match) {
      contents = Buffer.from(base64Match[1], 'base64').toString();
    } else {
      logger.debug(`The path "${mapPath}" does not specify a source map file`);
      return;
    }
  }

  let consumer: sourceMap.RawSourceMap;
  try {
    // TODO: Determine how to reconsile the type conflict where `consumer`
    //       is constructed as a SourceMapConsumer but is used as a
    //       RawSourceMap.
    // TODO: Resolve the cast of `contents as any` (This is needed because the
    //       type is expected to be of `RawSourceMap` but the existing
    //       working code uses a string.)
    consumer = (await new sourceMap.SourceMapConsumer(
      // eslint-disable-next-line @typescript-eslint/ban-types
      contents as {} as sourceMap.RawSourceMap
      // eslint-disable-next-line @typescript-eslint/ban-types
    )) as {} as sourceMap.RawSourceMap;
  } catch (e) {
    throw error(
      'An error occurred while reading the ' +
        'sourceMap file ' +
        mapPath +
        ': ' +
        e
    );
  }

  /* If the source map file defines a "file" attribute, use it as
   * the output file where the path is relative to the directory
   * containing the map file.  Otherwise, use the name of the output
   * file (with the .map extension removed) as the output file.

   * With nextjs/webpack, when there are subdirectories in `pages` directory,
   * the generated source maps do not reference correctly the generated files
   * in their `file` property.
   * For example if the generated file / source maps have paths:
   * <root>/pages/sub/foo.js(.map)
   * foo.js.map will have ../pages/sub/foo.js as `file` property instead of
   * ../../pages/sub/foo.js
   * To workaround this, check first if file referenced in `file` property
   * exists and if it does not, check if generated file exists alongside the
   * source map file.
   */
  const dir = path.dirname(mapPath);
  const generatedPathCandidates = [];
  if (consumer.file) {
    generatedPathCandidates.push(path.resolve(dir, consumer.file));
  }
  const samePath = path.resolve(dir, path.basename(mapPath, MAP_EXT));
  if (
    generatedPathCandidates.length === 0 ||
    generatedPathCandidates[0] !== samePath
  ) {
    generatedPathCandidates.push(samePath);
  }

  for (const generatedPath of generatedPathCandidates) {
    try {
      await fs.promises.access(generatedPath, fs.constants.F_OK);
      infoMap.set(generatedPath, { mapFileDir: dir, mapConsumer: consumer });
      if (debug) {
        logger.debug(`Loaded source map for ${generatedPath} => ${mapPath}`);
      }
      return;
    } catch (err) {
      if (debug) {
        logger.debug(`Generated path ${generatedPath} does not exist`);
      }
    }
  }
  if (debug) {
    logger.debug(`Unable to find generated file for ${mapPath}`);
  }
}

export class SourceMapper {
  infoMap: Map<string, MapInfoCompiled>;
  debug: boolean;

  static async create(
    searchDirs: string[],
    debug = false
  ): Promise<SourceMapper> {
    if (debug) {
      logger.debug(
        `Looking for source map files in dirs: [${searchDirs.join(', ')}]`
      );
    }

    const mapFiles: string[] = [];
    for (const dir of searchDirs) {
      try {
        const mf = await getMapFiles(dir);
        mf.forEach((mapFile) => {
          mapFiles.push(path.resolve(dir, mapFile));
        });
      } catch (e) {
        throw error(`failed to get source maps from ${dir}: ${e}`);
      }

      try {
        const sf = await getSourceCodeFiles(dir);
        sf.forEach((sourceCodeFile) => {
          mapFiles.push(path.resolve(dir, sourceCodeFile));
        });
      } catch (e) {
        throw error(`failed to get source maps from ${dir}: ${e}`);
      }
    }

    if (debug) {
      logger.debug(`Found source map files: [${mapFiles.join(', ')}]`);
    }

    return createFromMapFiles(mapFiles, debug);
  }

  /**
   * @param {Array.<string>} sourceMapPaths An array of paths to .map source map
   *  files that should be processed.  The paths should be relative to the
   *  current process's current working directory
   * @param {Logger} logger A logger that reports errors that occurred while
   *  processing the given source map files
   * @constructor
   */
  constructor(debug = false) {
    this.infoMap = new Map();
    this.debug = debug;
  }

  /**
   * Used to get the information about the transpiled file from a given input
   * source file provided there isn't any ambiguity with associating the input
   * path to exactly one output transpiled file.
   *
   * @param inputPath The (possibly relative) path to the original source file.
   * @return The `MapInfoCompiled` object that describes the transpiled file
   *  associated with the specified input path.  `null` is returned if either
   *  zero files are associated with the input path or if more than one file
   *  could possibly be associated with the given input path.
   */
  private getMappingInfo(inputPath: string): MapInfoCompiled | null {
    if (this.infoMap.has(path.normalize(inputPath))) {
      return this.infoMap.get(inputPath) as MapInfoCompiled;
    }
    return null;
  }

  /**
   * Used to determine if the source file specified by the given path has
   * a .map file and an output file associated with it.
   *
   * If there is no such mapping, it could be because the input file is not
   * the input to a transpilation process or it is the input to a transpilation
   * process but its corresponding .map file was not given to the constructor
   * of this mapper.
   *
   * @param {string} inputPath The path to an input file that could
   *  possibly be the input to a transpilation process.  The path should be
   *  relative to the process's current working directory.
   */
  hasMappingInfo(inputPath: string): boolean {
    return this.getMappingInfo(inputPath) !== null;
  }

  /**
   * @param {string} inputPath The path to an input file that could possibly
   *  be the input to a transpilation process.  The path should be relative to
   *  the process's current working directory
   * @param {number} The line number in the input file where the line number is
   *   zero-based.
   * @param {number} (Optional) The column number in the line of the file
   *   specified where the column number is zero-based.
   * @return {Object} The object returned has a "file" attribute for the
   *   path of the output file associated with the given input file (where the
   *   path is relative to the process's current working directory),
   *   a "line" attribute of the line number in the output file associated with
   *   the given line number for the input file, and an optional "column" number
   *   of the column number of the output file associated with the given file
   *   and line information.
   *
   *   If the given input file does not have mapping information associated
   *   with it then the input location is returned.
   */
  mappingInfo(location: GeneratedLocation): SourceLocation {
    const inputPath = path.normalize(location.file);
    const entry = this.getMappingInfo(inputPath);
    if (entry === null) {
      if (this.debug) {
        logger.debug(
          `Source map lookup failed: no map found for ${location.file} (normalized: ${inputPath})`
        );
      }
      return location;
    }

    const generatedPos = {
      line: location.line,
      column: location.column > 0 ? location.column - 1 : 0, // SourceMapConsumer expects column to be 0-based
    };

    // TODO: Determine how to remove the explicit cast here.
    const consumer: sourceMap.SourceMapConsumer =
      // eslint-disable-next-line @typescript-eslint/ban-types
      entry.mapConsumer as {} as sourceMap.SourceMapConsumer;

    const pos = consumer.originalPositionFor(generatedPos);
    if (pos.source === null) {
      if (this.debug) {
        logger.debug(
          `Source map lookup failed for ${location.name}(${location.file}:${location.line}:${location.column})`
        );
      }
      return location;
    }

    const loc = {
      file: path.resolve(entry.mapFileDir, pos.source),
      line: pos.line || undefined,
      name: pos.name || location.name,
      column: pos.column === null ? undefined : pos.column + 1, // convert column back to 1-based
    };

    if (this.debug) {
      logger.debug(
        `Source map lookup succeeded for ${location.name}(${location.file}:${location.line}:${location.column}) => ${loc.name}(${loc.file}:${loc.line}:${loc.column})`
      );
    }
    return loc;
  }
}

async function createFromMapFiles(
  mapFiles: string[],
  debug: boolean
): Promise<SourceMapper> {
  const limit = pLimit(CONCURRENCY);
  const mapper = new SourceMapper(debug);
  const promises: Array<Promise<void>> = mapFiles.map((mapPath) =>
    limit(() => processSourceMap(mapper.infoMap, mapPath, debug))
  );
  try {
    await Promise.all(promises);
  } catch (err) {
    throw error(
      'An error occurred while processing the source map files' + err
    );
  }
  return mapper;
}

function isErrnoException(e: unknown): e is NodeJS.ErrnoException {
  return e instanceof Error && 'code' in e;
}

function isNonFatalError(error: unknown) {
  const nonFatalErrors = ['ENOENT', 'EPERM', 'EACCES', 'ELOOP'];

  return (
    isErrnoException(error) && error.code && nonFatalErrors.includes(error.code)
  );
}

async function* walk(
  dir: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fileFilter = (filename: string) => true,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  directoryFilter = (root: string, dirname: string) => true
): AsyncIterable<string> {
  async function* walkRecursive(dir: string): AsyncIterable<string> {
    try {
      for await (const d of await fs.promises.opendir(dir)) {
        const entry = path.join(dir, d.name);
        if (d.isDirectory() && directoryFilter(dir, d.name)) {
          yield* walkRecursive(entry);
        } else if (d.isFile() && fileFilter(d.name)) {
          // check that the file is readable
          await fs.promises.access(entry, fs.constants.R_OK);
          yield entry;
        }
      }
    } catch (error) {
      if (!isNonFatalError(error)) {
        throw error;
      } else {
        logger.debug(() => `Non fatal error: ${error}`);
      }
    }
  }

  yield* walkRecursive(dir);
}

async function getMapFiles(baseDir: string): Promise<string[]> {
  const mapFiles: string[] = [];
  for await (const entry of walk(
    baseDir,
    (filename) => /\.[cm]?js\.map$/.test(filename),
    (root, dirname) =>
      root !== '/proc' && dirname !== '.git' && dirname !== 'node_modules'
  )) {
    mapFiles.push(path.relative(baseDir, entry));
  }
  return mapFiles;
}

async function getSourceCodeFiles(baseDir: string): Promise<string[]> {
  const mapFiles: string[] = [];
  for await (const entry of walk(
    baseDir,
    (filename) => /\.[cm]?js$/.test(filename),
    (root, dirname) =>
      root !== '/proc' && dirname !== '.git' && dirname !== 'node_modules'
  )) {
    mapFiles.push(path.relative(baseDir, entry));
  }
  return mapFiles;
}
