import { Environment } from '../environment.js';
import { StripFilenamesMode } from '../pyroscope-config.js';

export function getEnv(): Environment {
  return {
    adhocServerAddress: process.env['PYROSCOPE_ADHOC_SERVER_ADDRESS'],
    appName: process.env['PYROSCOPE_APPLICATION_NAME'],
    authToken: process.env['PYROSCOPE_AUTH_TOKEN'],
    flushIntervalMs: parseNumericEnv(
      process.env['PYROSCOPE_FLUSH_INTERVAL_MS']
    ),
    heapSamplingIntervalBytes: parseNumericEnv(
      process.env['PYROSCOPE_HEAP_SAMPLING_INTERVAL_BYTES']
    ),
    heapStackDepth: parseNumericEnv(process.env['PYROSCOPE_HEAP_STACK_DEPTH']),
    serverAddress: process.env['PYROSCOPE_SERVER_ADDRESS'],
    wallSamplingDurationMs: parseNumericEnv(
      process.env['PYROSCOPE_WALL_SAMPLING_DURATION_MS']
    ),
    wallSamplingIntervalMicros: parseNumericEnv(
      process.env['PYROSCOPE_WALL_SAMPLING_INTERVAL_MICROS']
    ),
    wallCollectCpuTime: parseBooleanEnv(
      process.env['PYROSCOPE_WALL_COLLECT_CPU_TIME']
    ),
    stripFilenames: parseStripFilenamesEnv(
      process.env['PYROSCOPE_STRIP_FILENAMES']
    ),
    shortenPaths: parseBooleanEnv(process.env['PYROSCOPE_SHORTEN_PATHS']),
  };
}

function parseStripFilenamesEnv(
  envVal: string | undefined
): StripFilenamesMode | undefined {
  return envVal === 'all' || envVal === 'dependencies' ? envVal : undefined;
}

function parseNumericEnv(envVal: string | undefined) {
  return envVal === undefined ? envVal : Number(envVal);
}

function parseBooleanEnv(envVal: string | undefined) {
  return envVal === undefined ? envVal : envVal === 'true' || envVal === '1';
}
