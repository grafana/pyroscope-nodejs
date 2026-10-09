import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { time } from '@datadog/pprof';
import Pyroscope, { wrapWithLabels } from '../src/index.js';
import { getProfiler } from '../src/utils/pyroscope-profiler.js';
import { checkPyroscopeConfig } from '../src/utils/check-pyroscope-config.js';
import { processConfig } from '../src/utils/process-config.js';
import { getEnv } from '../src/utils/get-env.js';

function start() {
  Pyroscope.init();
  const { profiler, startArgs } = getProfiler().wallProfiler;
  profiler.start(startArgs);
}

describe('synchronous labels (default mode)', () => {
  it('returns the callback result and forwards typed arguments', (t) => {
    start();
    t.after(() => time.stop());
    const result: number = wrapWithLabels(
      { page: 'item' },
      (a: number, b: number) => {
        assert.deepEqual(Pyroscope.getLabels(), { page: 'item' });
        return a + b;
      },
      2,
      3
    );
    assert.equal(result, 5);
    assert.deepEqual(Pyroscope.getLabels(), {});
  });

  it('restores parent labels on nested synchronous exceptions', (t) => {
    start();
    t.after(() => time.stop());
    Pyroscope.setLabels({ region: 'eu' });
    const error = new Error('callback failure');
    Pyroscope.wrapWithLabels({ page: 'item' }, () => {
      assert.throws(
        () =>
          Pyroscope.wrapWithLabels({ page: 'search' }, () => {
            throw error;
          }),
        (caught) => caught === error
      );
      assert.deepEqual(Pyroscope.getLabels(), { region: 'eu', page: 'item' });
    });
    assert.deepEqual(Pyroscope.getLabels(), { region: 'eu' });
  });

  it('preserves promise identity without extending the synchronous scope', async (t) => {
    start();
    t.after(() => time.stop());
    let original!: Promise<number>;
    const returned: Promise<number> = Pyroscope.wrapWithLabels(
      { page: 'item' },
      () => {
        original = (async () => {
          assert.deepEqual(Pyroscope.getLabels(), { page: 'item' });
          await Promise.resolve();
          assert.deepEqual(Pyroscope.getLabels(), {});
          return 7;
        })();
        return original;
      }
    );
    assert.equal(returned, original);
    assert.equal(await returned, 7);
  });
});

describe('async-context configuration', () => {
  for (const value of ['true', 1, null, {}, []]) {
    it(`rejects non-boolean asyncContext ${JSON.stringify(value)}`, () => {
      assert.throws(
        () => checkPyroscopeConfig({ wall: { asyncContext: value } }),
        /valid wall options/
      );
    });
  }

  it('allows explicit false to override environment opt-in', () => {
    const previous = process.env.PYROSCOPE_WALL_ASYNC_CONTEXT;
    try {
      for (const value of ['true', '1']) {
        process.env.PYROSCOPE_WALL_ASYNC_CONTEXT = value;
        assert.equal(processConfig({}, getEnv()).wall?.asyncContext, true);
        assert.equal(
          processConfig({ wall: { asyncContext: false } }, getEnv()).wall
            ?.asyncContext,
          false
        );
      }
      process.env.PYROSCOPE_WALL_ASYNC_CONTEXT = 'false';
      assert.equal(
        processConfig({ wall: { asyncContext: true } }, getEnv()).wall
          ?.asyncContext,
        true
      );
      delete process.env.PYROSCOPE_WALL_ASYNC_CONTEXT;
      assert.equal(processConfig({}, getEnv()).wall?.asyncContext, undefined);
    } finally {
      if (previous === undefined)
        delete process.env.PYROSCOPE_WALL_ASYNC_CONTEXT;
      else process.env.PYROSCOPE_WALL_ASYNC_CONTEXT = previous;
    }
  });
});
