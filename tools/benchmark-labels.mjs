import { AsyncLocalStorage } from 'node:async_hooks';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const mode = process.argv[2] ?? 'async';
if (!['plain', 'sync', 'async'].includes(mode)) {
  throw new Error('Usage: node tools/benchmark-labels.mjs [plain|sync|async]');
}
const sdkRoot = process.env.SDK_ROOT ?? resolve('dist/cjs');
const { WallProfiler } = await import(
  pathToFileURL(resolve(sdkRoot, 'profilers/wall-profiler.js')).href
);
const profiler = new WallProfiler(mode === 'async');
const tracing = new AsyncLocalStorage();
const concurrency = 8;
const requests = 80_000;
const awaitsPerRequest = 200;

async function run(count) {
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let i = 0; i < count / concurrency; i++) {
        let pending;
        tracing.run('trace', () => {
          const work = () => {
            pending = (async () => {
              for (let j = 0; j < awaitsPerRequest; j++)
                await Promise.resolve();
            })();
          };
          if (mode === 'plain') work();
          else profiler.wrapWithLabels({ page: 'item' }, work);
        });
        await pending;
      }
    })
  );
}

profiler.start({
  samplingDurationMs: 60_000,
  samplingIntervalMicros: 40_000,
  collectCpuTime: true,
  sourceMapper: undefined,
});
try {
  await run(800);
  const start = performance.now();
  await run(requests);
  console.log(
    JSON.stringify({
      node: process.version,
      mode,
      requests,
      concurrency,
      awaitsPerRequest,
      elapsedMs: performance.now() - start,
      rssMiB: process.memoryUsage().rss / 1024 / 1024,
    })
  );
} finally {
  profiler.stop();
}
