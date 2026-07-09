import { Function as PprofFunction, Profile, StringTable } from 'pprof-format';

import { StripFilenamesMode } from '../pyroscope-config.js';

const V8_NAME_TO_GOLANG_NAME_MAP: Record<string, string> = {
  objects: 'inuse_objects',
  sample: 'samples',
  space: 'inuse_space',
};

const NODE_MODULES_SEGMENT = 'node_modules/';

export interface ProcessProfileOptions {
  stripFilenames?: StripFilenamesMode | undefined;
  shortenPaths?: boolean | undefined;
}

export function processProfile(
  profile: Profile,
  options: ProcessProfileOptions = {}
): Profile {
  adjustSampleNames(profile);
  adjustCwdPaths(profile, options.shortenPaths ?? false);

  if (options.stripFilenames !== undefined) {
    stripFilenames(profile, options.stripFilenames);
    rebuildStringTable(profile);
  }

  return profile;
}

function adjustCwdPaths(profile: Profile, shortenPaths: boolean): void {
  const cwd: string = process.cwd();

  for (const location of profile.location) {
    for (const line of location.line) {
      const functionId = Number(line.functionId);
      const contextFunction: PprofFunction | undefined =
        profile.function[functionId - 1];

      if (contextFunction !== undefined) {
        const functionName: string | undefined =
          profile.stringTable.strings[Number(contextFunction.name)];

        if (
          !functionName?.includes(':') ||
          functionName?.startsWith('(anonymous')
        ) {
          const fileName: string = profile.stringTable.strings[
            Number(contextFunction.filename)
          ] as string;

          const displayPath: string =
            (shortenPaths ? packageRelativePath(fileName) : undefined) ??
            fileName.replace(cwd, '.');

          const newName = `${displayPath}:${functionName}:${line.line}`;

          contextFunction.name = profile.stringTable.dedup(newName);
        }
      }
    }
  }
}

// For files vendored under node_modules, the path relative to the innermost
// package is enough to identify the file, while the (potentially nested)
// prefix is the biggest contributor to the profile's string table size.
function packageRelativePath(fileName: string): string | undefined {
  const index: number = fileName.lastIndexOf(NODE_MODULES_SEGMENT);

  if (index === -1) {
    return undefined;
  }

  return fileName.slice(index + NODE_MODULES_SEGMENT.length);
}

function stripFilenames(profile: Profile, mode: StripFilenamesMode): void {
  for (const contextFunction of profile.function) {
    if (mode === 'dependencies') {
      const fileName: string | undefined =
        profile.stringTable.strings[Number(contextFunction.filename)];

      if (!fileName?.includes(NODE_MODULES_SEGMENT)) {
        continue;
      }
    }

    contextFunction.filename = 0;
  }
}

// Stripped filenames leave their path strings unreferenced, but StringTable
// only ever grows, so the profile has to be rewritten onto a fresh table for
// the size reduction to materialize.
function rebuildStringTable(profile: Profile): void {
  const oldStrings: string[] = profile.stringTable.strings;
  const newTable = new StringTable();
  const remap = (index: number | bigint): number =>
    newTable.dedup(oldStrings[Number(index)] ?? '');

  for (const valueType of profile.sampleType) {
    valueType.type = remap(valueType.type);
    valueType.unit = remap(valueType.unit);
  }

  for (const sample of profile.sample) {
    for (const label of sample.label) {
      label.key = remap(label.key);
      label.str = remap(label.str);
      label.numUnit = remap(label.numUnit);
    }
  }

  for (const mapping of profile.mapping) {
    mapping.filename = remap(mapping.filename);
    mapping.buildId = remap(mapping.buildId);
  }

  for (const contextFunction of profile.function) {
    contextFunction.name = remap(contextFunction.name);
    contextFunction.systemName = remap(contextFunction.systemName);
    contextFunction.filename = remap(contextFunction.filename);
  }

  if (profile.periodType !== undefined) {
    profile.periodType.type = remap(profile.periodType.type);
    profile.periodType.unit = remap(profile.periodType.unit);
  }

  profile.dropFrames = remap(profile.dropFrames);
  profile.keepFrames = remap(profile.keepFrames);
  profile.comment = profile.comment.map(remap);
  profile.defaultSampleType = remap(profile.defaultSampleType);
  profile.stringTable = newTable;
}

function adjustSampleNames(profile: Profile): void {
  // Replace the names of the samples to meet golang naming
  for (const valueType of profile.sampleType) {
    for (const [replacementsKey, replacementVal] of Object.entries(
      V8_NAME_TO_GOLANG_NAME_MAP
    )) {
      const unit: string | undefined =
        profile.stringTable.strings[Number(valueType.unit)];

      if (unit === replacementsKey) {
        valueType.unit = profile.stringTable.dedup(replacementVal);
      }

      const type: string | undefined =
        profile.stringTable.strings[Number(valueType.type)];

      if (type === replacementsKey) {
        valueType.type = profile.stringTable.dedup(replacementVal);
      }
    }
  }
}
