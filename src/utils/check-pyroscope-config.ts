import {
  PyroscopeConfig,
  PyroscopeHeapConfig,
  PyroscopeWallConfig,
} from '../pyroscope-config';

export function checkPyroscopeConfig(
  config: unknown
): asserts config is PyroscopeConfig {
  if (!isObject(config)) {
    throw new Error('Expecting an object config');
  }

  const errors: string[] = [];

  if (!hasValidApplicationName(config)) {
    errors.push('Expecting a config with string appName');
  }

  if (!hasValidAuthToken(config)) {
    errors.push('Expecting a config with string auth token');
  }

  if (!hasValidFlushInterval(config)) {
    errors.push('Expecting a config with integer flush interval');
  }

  if (!hasValidMemory(config)) {
    errors.push('Expecting a config with valid memory options');
  }

  if (!hasValidServerAddress(config)) {
    errors.push('Expecting a config with string serverAddress');
  }

  if (!hasValidWall(config)) {
    errors.push('Expecting a config with valid wall options');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid config:\n\n${errors.join('\n')}`);
  }
}

function hasValidApplicationName(
  config: Record<string | symbol, unknown>
): boolean {
  return (
    (config as Partial<PyroscopeConfig>).appName === undefined ||
    typeof (config as Partial<PyroscopeConfig>).appName === 'string'
  );
}

function hasValidAuthToken(config: Record<string | symbol, unknown>): boolean {
  return (
    (config as Partial<PyroscopeConfig>).authToken === undefined ||
    typeof (config as Partial<PyroscopeConfig>).authToken === 'string'
  );
}

function hasValidFlushInterval(
  config: Record<string | symbol, unknown>
): boolean {
  return (
    (config as Partial<PyroscopeConfig>).flushIntervalMs === undefined ||
    (typeof (config as Partial<PyroscopeConfig>).flushIntervalMs === 'number' &&
      Number.isInteger((config as Partial<PyroscopeConfig>).flushIntervalMs))
  );
}

function hasValidMemory(config: Record<string | symbol, unknown>): boolean {
  if ((config as Partial<PyroscopeConfig>).heap === undefined) {
    return true;
  }

  const memoryConfig: unknown = (config as Partial<PyroscopeConfig>).heap;

  if (!isObject(memoryConfig)) {
    return false;
  }

  return (
    hasValidSamplingIntervalBytes(memoryConfig) &&
    hasValidStackDepth(memoryConfig)
  );
}

function hasValidSamplingDurationMs(
  wallConfig: Record<string | symbol, unknown>
): boolean {
  return (
    (wallConfig as Partial<PyroscopeWallConfig>).samplingDurationMs ===
      undefined ||
    (typeof (wallConfig as Partial<PyroscopeWallConfig>).samplingDurationMs ===
      'number' &&
      Number.isInteger(
        (wallConfig as Partial<PyroscopeWallConfig>).samplingDurationMs
      ))
  );
}

function hasValidSamplingIntervalBytes(
  memoryConfig: Record<string | symbol, unknown>
): boolean {
  return (
    (memoryConfig as Partial<PyroscopeHeapConfig>).samplingIntervalBytes ===
      undefined ||
    typeof (memoryConfig as Partial<PyroscopeHeapConfig>)
      .samplingIntervalBytes === 'number'
  );
}

function hasValidSamplingIntervalMicros(
  wallConfig: Record<string | symbol, unknown>
): boolean {
  return (
    (wallConfig as Partial<PyroscopeWallConfig>).samplingIntervalMicros ===
      undefined ||
    (typeof (wallConfig as Partial<PyroscopeWallConfig>)
      .samplingIntervalMicros === 'number' &&
      Number.isInteger(
        (wallConfig as Partial<PyroscopeWallConfig>).samplingIntervalMicros
      ))
  );
}

function hasValidStackDepth(
  memoryConfig: Record<string | symbol, unknown>
): boolean {
  return (
    (memoryConfig as Partial<PyroscopeHeapConfig>).stackDepth === undefined ||
    typeof (memoryConfig as Partial<PyroscopeHeapConfig>).stackDepth ===
      'number'
  );
}

function hasValidServerAddress(
  config: Record<string | symbol, unknown>
): boolean {
  return (
    (config as Partial<PyroscopeConfig>).serverAddress === undefined ||
    typeof (config as Partial<PyroscopeConfig>).serverAddress === 'string'
  );
}

function hasValidWall(config: Record<string | symbol, unknown>): boolean {
  if ((config as Partial<PyroscopeConfig>).wall === undefined) {
    return true;
  }

  const wallConfig: unknown = (config as Partial<PyroscopeConfig>).wall;

  if (!isObject(wallConfig)) {
    return false;
  }

  return (
    hasValidSamplingDurationMs(wallConfig) &&
    hasValidSamplingIntervalMicros(wallConfig)
  );
}

function isObject(object: unknown): object is Record<string, unknown> {
  return object !== null && typeof object === 'object';
}
