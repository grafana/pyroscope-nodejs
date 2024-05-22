import { Environment } from '../environment'
import { PyroscopeConfig } from '../pyroscope-config'

export function processConfig(
  config: PyroscopeConfig,
  env: Environment
): PyroscopeConfig {
  const processedConfig: PyroscopeConfig = {
    appName: config.appName ?? env.appName,
    authToken: config.authToken ?? env.authToken,
    flushIntervalMs: config.flushIntervalMs ?? env.flushIntervalMs,
    heap: {
      samplingIntervalBytes:
        config.heap?.samplingIntervalBytes ?? env.heapSamplingIntervalBytes,
      stackDepth: config.heap?.stackDepth ?? env.heapStackDepth,
    },
    serverAddress:
      env.adhocServerAddress ?? config.serverAddress ?? env.serverAddress,
    tags: config.tags,
    wall: {
      samplingDurationMs:
        config.wall?.samplingDurationMs ?? env.wallSamplingDurationMs,
      samplingIntervalMicros:
        config.wall?.samplingIntervalMicros ?? env.wallSamplingIntervalMicros,
      collectCpuTime: config.wall?.collectCpuTime ?? false,
    },
    sourceMapper: config.sourceMapper,
    basicAuthUser: config.basicAuthUser,
    basicAuthPassword: config.basicAuthPassword,
    tenantID: config.tenantID,
  }

  return processedConfig
}
