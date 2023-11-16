import { Environment } from '../environment'

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
    heapStackDepth: parseNumericEnv(
      process.env['PYROSCOPE_HEAP_SAMPLING_INTERVAL_MICROS']
    ),
    serverAddress: process.env['PYROSCOPE_SERVER_ADDRESS'],
    wallSamplingDurationMs: parseNumericEnv(
      process.env['PYROSCOPE_WALL_SAMPLING_DURATION_MS']
    ),
    wallSamplingIntervalMicros: parseNumericEnv(
      process.env['PYROSCOPE_WALL_SAMPLING_INTERVAL_MICROS']
    ),
  }
}

function parseNumericEnv(envVal: string | undefined) {
  return envVal === undefined ? envVal : Number(envVal)
}
