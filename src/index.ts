import 'regenerator-runtime/runtime.js';

import { setLogger as datadogSetLogger } from '@datadog/pprof';
import { Logger, setLogger as ourSetLogger } from './logger.js';
import { PyroscopeProfiler } from './profilers/pyroscope-profiler.js';
import {
  PyroscopeConfig,
  PyroscopeHeapConfig,
  PyroscopeWallConfig,
} from './pyroscope-config.js';
import { SourceMapper } from './sourcemapper.js';
import { checkPyroscopeConfig } from './utils/check-pyroscope-config.js';
import { getEnv } from './utils/get-env.js';
import { processConfig } from './utils/process-config.js';
import { getProfiler, setProfiler } from './utils/pyroscope-profiler.js';

export function init(config: PyroscopeConfig = {}): void {
  checkPyroscopeConfig(config);

  const processedConfig: PyroscopeConfig = processConfig(config, getEnv());

  setProfiler(new PyroscopeProfiler(processedConfig));
}

// deprecated: please use getLabels
function getWallLabels(): Record<string, number | string> {
  return getLabels();
}

// deprecated: please use setLabels
function setWallLabels(labels: Record<string, number | string>): void {
  return setLabels(labels);
}

function getLabels(): Record<string, number | string> {
  return getProfiler().wallProfiler.profiler.getLabels();
}

function setLabels(labels: Record<string, number | string>): void {
  getProfiler().wallProfiler.profiler.setLabels(labels);
}

export function wrapWithLabels(
  lbls: Record<string, string | number>,
  fn: () => void,
  ...args: unknown[]
): void {
  getProfiler().wallProfiler.profiler.wrapWithLabels(lbls, fn, ...args);
}

function startWallProfiling(): void {
  getProfiler().wallProfiler.start();
}

// here for backwards compatibility
function startCpuProfiling(): void {
  getProfiler().wallProfiler.start();
}

async function stopWallProfiling(): Promise<void> {
  await getProfiler().wallProfiler.stop();
}

// here for backwards compatibility
async function stopCpuProfiling(): Promise<void> {
  await getProfiler().wallProfiler.stop();
}

function startHeapProfiling(): void {
  getProfiler().heapProfiler.start();
}

async function stopHeapProfiling(): Promise<void> {
  await getProfiler().heapProfiler.stop();
}

export function start(): void {
  startWallProfiling();
  startHeapProfiling();
}

export async function stop(): Promise<void> {
  await Promise.all([stopWallProfiling(), stopHeapProfiling()]);
}

export { PyroscopeConfig, PyroscopeHeapConfig, PyroscopeWallConfig };

function setLogger(logger: Logger): void {
  datadogSetLogger(logger);
  ourSetLogger(logger);
}

// Load middleware eagerly - this ensures middleware is loaded before the module exports
let expressMiddleware: (() => unknown) | undefined;
let fastifyMiddleware: (() => unknown) | undefined;

// Load middleware before creating BaseImport to eliminate race conditions
await (async () => {
  await Promise.allSettled([
    import('./middleware/express.js')
      .then((module) => {
        expressMiddleware = module.default;
      })
      .catch((error) => {
        console.debug('Error loading express middleware:', error);
      }),
    import('./middleware/fastify.js')
      .then((module) => {
        fastifyMiddleware = module.default;
      })
      .catch((error) => {
        console.debug('Error loading fastify middleware:', error);
      }),
  ]);
})();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BaseImport: any = {
  SourceMapper,
  init,
  getWallLabels,
  setWallLabels,
  getLabels,
  setLabels,
  wrapWithLabels,
  start,
  startHeapProfiling,
  startWallProfiling,
  startCpuProfiling,
  stop,
  stopHeapProfiling,
  stopWallProfiling,
  stopCpuProfiling,
  setLogger,
  get expressMiddleware() {
    if (expressMiddleware === undefined) {
      throw new Error(
        'Express middleware failed to load. Please ensure express is installed as a peer dependency.'
      );
    }
    return expressMiddleware;
  },
  get fastifyMiddleware() {
    if (fastifyMiddleware === undefined) {
      throw new Error(
        'Fastify middleware failed to load. Please ensure fastify is installed as a peer dependency.'
      );
    }
    return fastifyMiddleware;
  },
};

export default BaseImport;
