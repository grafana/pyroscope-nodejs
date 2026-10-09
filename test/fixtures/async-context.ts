import { strict as assert } from 'node:assert';
import { AsyncLocalStorage, AsyncResource } from 'node:async_hooks';
import { createServer } from 'node:http';
import { setImmediate, setTimeout } from 'node:timers/promises';
import { gunzipSync } from 'node:zlib';
import { time } from '@datadog/pprof';
import { Profile } from 'pprof-format';
import Pyroscope, { wrapWithLabels } from '../../src/index.js';
import { getProfiler } from '../../src/utils/pyroscope-profiler.js';

const profiles: Profile[] = [];
let uploaded!: () => void;
const firstUpload = new Promise<void>((resolve) => {
  uploaded = resolve;
});
const server = createServer(async (req, res) => {
  assert.ok(req.url?.includes('format=pprof'));
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  profiles.push(Profile.decode(gunzipSync(Buffer.concat(chunks))));
  res.end('ok');
  uploaded();
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
assert.ok(address && typeof address !== 'string');
const config = {
  appName: 'async-label-test',
  serverAddress: `http://127.0.0.1:${address.port}`,
  flushIntervalMs: 40,
  wall: {
    asyncContext: true,
    samplingIntervalMicros: 1000,
    collectCpuTime: true,
  },
};

try {
  Pyroscope.init(config);
  if (process.argv[2] === 'unsupported') {
    assert.throws(
      () => Pyroscope.start(),
      /wall.asyncContext requires native AsyncContextFrame/
    );
    assert.equal(time.isStarted(), false);
    Pyroscope.init({
      ...config,
      wall: { ...config.wall, asyncContext: false },
    });
    Pyroscope.startWallProfiling();
    assert.equal(
      wrapWithLabels({ page: 'item' }, () => 42),
      42
    );
  } else {
    Pyroscope.startWallProfiling();
    await verifyContract();
    await verifySamples();
  }
} finally {
  await Pyroscope.stop();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
}

async function verifyContract() {
  assert.deepEqual(Pyroscope.getLabels(), {});
  assert.throws(
    () => Pyroscope.setLabels({ page: 'item' }),
    /use wrapWithLabels/
  );
  assert.throws(
    () => Pyroscope.setWallLabels({ page: 'item' }),
    /use wrapWithLabels/
  );
  const result: number = wrapWithLabels(
    { page: 'item' },
    (a: number, b: number) => a + b,
    2,
    3
  );
  assert.equal(result, 5);
  const original = Promise.resolve(8);
  const returned: Promise<number> = wrapWithLabels({}, () => original);
  assert.equal(returned, original);
  assert.equal(await returned, 8);

  const error = new Error('callback failure');
  assert.throws(
    () =>
      wrapWithLabels({ page: 'item' }, () => {
        throw error;
      }),
    (caught) => caught === error
  );
  assert.deepEqual(Pyroscope.getLabels(), {});
  const tracing = new AsyncLocalStorage<string>();
  await tracing.run('trace-id', () =>
    wrapWithLabels({ page: 'item', shard: 3 }, async () => {
      await setTimeout(1);
      assert.equal(tracing.getStore(), 'trace-id');
      await assert.rejects(
        wrapWithLabels({ page: 'search' }, async () => {
          await Promise.resolve();
          assert.deepEqual(Pyroscope.getLabels(), { page: 'search', shard: 3 });
          throw error;
        }),
        (caught) => caught === error
      );
      assert.deepEqual(Pyroscope.getWallLabels(), { page: 'item', shard: 3 });
      assert.throws(
        () =>
          wrapWithLabels({ page: 'search' }, () => {
            throw error;
          }),
        (caught) => caught === error
      );
      assert.deepEqual(Pyroscope.getLabels(), { page: 'item', shard: 3 });

      getProfiler().wallProfiler.profiler.profile();
      assert.deepEqual(Pyroscope.getLabels(), { page: 'item', shard: 3 });
      await setImmediate();
      assert.deepEqual(Pyroscope.getLabels(), { page: 'item', shard: 3 });
    })
  );
  assert.equal(tracing.getStore(), undefined);
  assert.deepEqual(Pyroscope.getLabels(), {});

  const resource = wrapWithLabels(
    { page: 'search' },
    () => new AsyncResource('scoped-work')
  );
  try {
    await wrapWithLabels({ page: 'item' }, async () => {
      await setImmediate();
      resource.runInAsyncScope(() =>
        assert.deepEqual(Pyroscope.getLabels(), { page: 'search' })
      );
      assert.deepEqual(Pyroscope.getLabels(), { page: 'item' });
    });
  } finally {
    resource.emitDestroy();
  }
}

function burn() {
  const end = performance.now() + 120;
  while (performance.now() < end) Math.sqrt(Math.random());
}
function itemBeforeAwait() {
  burn();
}
function itemAfterAwait() {
  burn();
}
function itemAfterFlush() {
  burn();
}
function searchAfterAwait() {
  burn();
}
function nestedSearch() {
  burn();
}
function itemAfterNested() {
  burn();
}
function unrelatedWork() {
  burn();
}

async function verifySamples() {
  await Promise.all([
    wrapWithLabels({ page: 'item', shard: 3 }, async () => {
      itemBeforeAwait();
      await Promise.resolve();
      assert.deepEqual(Pyroscope.getLabels(), { page: 'item', shard: 3 });
      itemAfterAwait();
      await firstUpload;
      assert.deepEqual(Pyroscope.getLabels(), { page: 'item', shard: 3 });
      itemAfterFlush();
      await wrapWithLabels({ page: 'search' }, async () => {
        await setImmediate();
        nestedSearch();
      });
      itemAfterNested();
    }),
    wrapWithLabels({ page: 'search' }, async () => {
      await setTimeout(1);
      assert.deepEqual(Pyroscope.getLabels(), { page: 'search' });
      searchAfterAwait();
    }),
    (async () => {
      await setImmediate();
      assert.deepEqual(Pyroscope.getLabels(), {});
      unrelatedWork();
    })(),
  ]);
  await Pyroscope.stopWallProfiling();
  assert.ok(
    profiles.length >= 2,
    'must include a periodic export and final flush'
  );

  const expected: Record<string, Record<string, string | number>> = {
    itemBeforeAwait: { page: 'item', shard: 3 },
    itemAfterAwait: { page: 'item', shard: 3 },
    itemAfterFlush: { page: 'item', shard: 3 },
    searchAfterAwait: { page: 'search' },
    nestedSearch: { page: 'search', shard: 3 },
    itemAfterNested: { page: 'item', shard: 3 },
    unrelatedWork: {},
  };
  const seen = new Set<string>();
  for (const profile of profiles) {
    const string = (id: number | bigint) =>
      profile.stringTable.strings[Number(id)];
    assert.ok(profile.sampleType.some((type) => string(type.type) === 'cpu'));
    const functions = new Map(
      profile.function.map((fn) => [Number(fn.id), string(fn.name)])
    );
    const locations = new Map(
      profile.location.map((loc) => [
        Number(loc.id),
        loc.line.map((line) => functions.get(Number(line.functionId)) ?? ''),
      ])
    );
    for (const sample of profile.sample) {
      const names = sample.locationId.flatMap(
        (id) => locations.get(Number(id)) ?? []
      );
      const work = Object.keys(expected).find((name) =>
        names.some((frame) => frame.includes(`:${name}:`))
      );
      if (!work) continue;
      const labels = Object.fromEntries(
        sample.label.map((label) => [
          string(label.key),
          Number(label.str) === 0 ? Number(label.num) : string(label.str),
        ])
      );
      assert.deepEqual(labels, expected[work], `${work} sample attribution`);
      assert.ok(Number(sample.value[0]) > 0);
      seen.add(work);
    }
  }
  assert.deepEqual(
    [...seen].sort(),
    Object.keys(expected).sort(),
    'every named workload must have real samples'
  );
}
