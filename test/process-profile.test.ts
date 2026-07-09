import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  Function as PprofFunction,
  Line,
  Location,
  Profile,
  Sample,
  StringTable,
  ValueType,
} from 'pprof-format';
import { processProfile } from '../src/utils/process-profile.js';

const APP_FILE = `${process.cwd()}/svc/handler.js`;
const DEP_FILE = `${process.cwd()}/node_modules/@scope/pkg/node_modules/nested-dep/dist/index.js`;

function buildProfile(): Profile {
  const stringTable = new StringTable();
  const str = (value: string): number => stringTable.dedup(value);

  return new Profile({
    sampleType: [new ValueType({ type: str('objects'), unit: str('count') })],
    sample: [new Sample({ locationId: [2, 1], value: [10] })],
    location: [
      new Location({ id: 1, line: [new Line({ functionId: 1, line: 10 })] }),
      new Location({ id: 2, line: [new Line({ functionId: 2, line: 42 })] }),
    ],
    function: [
      new PprofFunction({
        id: 1,
        name: str('(anonymous)'),
        systemName: str('(anonymous)'),
        filename: str(APP_FILE),
      }),
      new PprofFunction({
        id: 2,
        name: str('handleRequest'),
        systemName: str('handleRequest'),
        filename: str(DEP_FILE),
      }),
    ],
    stringTable,
  });
}

function functionNames(profile: Profile): string[] {
  return profile.function.map(
    (fn) => profile.stringTable.strings[Number(fn.name)] as string
  );
}

function fileName(profile: Profile, functionIndex: number): string {
  return profile.stringTable.strings[
    Number(profile.function[functionIndex]!.filename)
  ] as string;
}

describe('processProfile', () => {
  it('generates function names with cwd-relative paths by default', () => {
    const profile = processProfile(buildProfile());

    assert.deepEqual(functionNames(profile), [
      './svc/handler.js:(anonymous):10',
      './node_modules/@scope/pkg/node_modules/nested-dep/dist/index.js:handleRequest:42',
    ]);
    assert.equal(fileName(profile, 0), APP_FILE);
    assert.equal(fileName(profile, 1), DEP_FILE);
  });

  it('uses package-relative paths with shortenPaths', () => {
    const profile = processProfile(buildProfile(), { shortenPaths: true });

    assert.deepEqual(functionNames(profile), [
      './svc/handler.js:(anonymous):10',
      'nested-dep/dist/index.js:handleRequest:42',
    ]);
    assert.equal(fileName(profile, 1), DEP_FILE);
  });

  it('removes every filename with stripFilenames: all', () => {
    const profile = processProfile(buildProfile(), { stripFilenames: 'all' });

    assert.equal(Number(profile.function[0]!.filename), 0);
    assert.equal(Number(profile.function[1]!.filename), 0);

    // display names still carry the path
    assert.deepEqual(functionNames(profile), [
      './svc/handler.js:(anonymous):10',
      './node_modules/@scope/pkg/node_modules/nested-dep/dist/index.js:handleRequest:42',
    ]);

    // the orphaned path strings must not survive in the string table
    assert.ok(!profile.stringTable.strings.includes(APP_FILE));
    assert.ok(!profile.stringTable.strings.includes(DEP_FILE));
  });

  it('keeps first-party filenames with stripFilenames: dependencies', () => {
    const profile = processProfile(buildProfile(), {
      stripFilenames: 'dependencies',
    });

    assert.equal(fileName(profile, 0), APP_FILE);
    assert.equal(Number(profile.function[1]!.filename), 0);
    assert.ok(!profile.stringTable.strings.includes(DEP_FILE));
  });

  it('remaps sample type names when rebuilding the string table', () => {
    const profile = processProfile(buildProfile(), { stripFilenames: 'all' });

    const sampleType = profile.sampleType[0]!;
    assert.equal(
      profile.stringTable.strings[Number(sampleType.type)],
      'inuse_objects'
    );
    assert.equal(
      profile.stringTable.strings[Number(sampleType.unit)],
      'count'
    );
    assert.equal(profile.stringTable.strings[0], '');
  });
});
