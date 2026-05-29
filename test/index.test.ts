import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import fs from 'node:fs';
import { Profile } from 'pprof-format';
import Pyroscope from '../src/index.js';
import { processProfile } from '../src/utils/process-profile.js';

describe('typescript env', () => {
  it('has correct imports', () => {
    assert.strictEqual(typeof Pyroscope.init, 'function');
    assert.strictEqual(typeof Pyroscope.startWallProfiling, 'function');
    assert.strictEqual(typeof Pyroscope.stopWallProfiling, 'function');
    assert.strictEqual(typeof Pyroscope.startHeapProfiling, 'function');
    assert.strictEqual(typeof Pyroscope.stopHeapProfiling, 'function');

    assert.strictEqual(typeof Pyroscope.expressMiddleware, 'function');
  });

  it('can process profile', () => {
    const profile = Profile.decode(fs.readFileSync('./test/profile1.data'));
    const newProfile = processProfile(profile);

    assert.strictEqual(newProfile.stringTable.strings.length, 20);

    // Check we're receiving right data
    assert.ok(
      newProfile.stringTable.strings.includes('node:internal/modules/run_main')
    );
    assert.ok(
      newProfile.stringTable.strings.includes(
        '/home/korniltsev/pyroscope/pyroscope-nodejs/dist/cjs/cpu.js'
      )
    );

    // // Check profiles replacement works
    assert.ok(profile.stringTable.strings.includes('sample'));
    assert.ok(newProfile.stringTable.strings.includes('samples'));
  });
});
