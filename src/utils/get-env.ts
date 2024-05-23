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
  }
}

function parseNumericEnv(envVal: string | undefined) {
  return envVal === undefined ? envVal : Number(envVal)
}

function parseBooleanEnv(envVal: string | undefined) {
  return envVal === undefined
    ? envVal
    : process.env.headless === 'true' || process.env.headless === '1'
}
