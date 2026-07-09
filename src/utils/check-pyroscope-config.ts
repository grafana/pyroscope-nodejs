import {
  PyroscopeConfig,
  PyroscopeHeapConfig,
  PyroscopeWallConfig,
} from '../pyroscope-config.js';

const INVALID_LABEL_CHARACTERS = ['{', '}', ',', '='] as const;
const INVALID_LABEL_CHARACTERS_MESSAGE = "'{', '}', ',', or '=' characters";

export function checkPyroscopeConfig(
  config: unknown
): asserts config is PyroscopeConfig {
  if (!isObject(config)) {
    throw new Error('Expecting an object config');
  }

  const errors: string[] = [];

  if (!hasValidApplicationName(config)) {
    errors.push('Expecting a config with string appName');
  } else {
    validateApplicationName(config, errors);
  }

  validateTags(config, errors);

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

  if (!hasValidStripFilenames(config)) {
    errors.push(
      "Expecting a config with stripFilenames set to 'all' or 'dependencies'"
    );
  }

  if (!hasValidShortenPaths(config)) {
    errors.push('Expecting a config with boolean shortenPaths');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid config:\n\n${errors.join('\n')}`);
  }
}

function hasValidStripFilenames(
  config: Record<string | symbol, unknown>
): boolean {
  const stripFilenames = (config as Partial<PyroscopeConfig>).stripFilenames;

  return (
    stripFilenames === undefined ||
    stripFilenames === 'all' ||
    stripFilenames === 'dependencies'
  );
}

function hasValidShortenPaths(
  config: Record<string | symbol, unknown>
): boolean {
  const shortenPaths = (config as Partial<PyroscopeConfig>).shortenPaths;

  return shortenPaths === undefined || typeof shortenPaths === 'boolean';
}

function hasValidApplicationName(
  config: Record<string | symbol, unknown>
): boolean {
  return (
    (config as Partial<PyroscopeConfig>).appName === undefined ||
    typeof (config as Partial<PyroscopeConfig>).appName === 'string'
  );
}

function validateApplicationName(
  config: Record<string | symbol, unknown>,
  errors: string[]
): void {
  const appName: string | undefined = (config as Partial<PyroscopeConfig>)
    .appName;

  if (appName === undefined) {
    return;
  }

  if (hasInvalidLabelCharacters(appName)) {
    errors.push(`appName must not contain ${INVALID_LABEL_CHARACTERS_MESSAGE}`);
  }
}

function validateTags(
  config: Record<string | symbol, unknown>,
  errors: string[]
): void {
  const tags: unknown = (config as Partial<PyroscopeConfig>).tags;

  if (tags === undefined) {
    return;
  }

  if (!isObject(tags)) {
    errors.push('Expecting a config with object tags');
    return;
  }

  for (const [tagKey, tagValue] of Object.entries(tags)) {
    if (hasInvalidLabelCharacters(tagKey)) {
      errors.push(
        `tag key "${tagKey}" must not contain ${INVALID_LABEL_CHARACTERS_MESSAGE}`
      );
    }

    if (typeof tagValue === 'string' && hasInvalidLabelCharacters(tagValue)) {
      errors.push(
        `tag value "${tagValue}" for key "${tagKey}" must not contain ${INVALID_LABEL_CHARACTERS_MESSAGE}`
      );
    } else if (typeof tagValue !== 'number' && typeof tagValue !== 'string') {
      errors.push(
        `tag value "${String(tagValue)}" for key "${tagKey}" must be a string or number`
      );
    }
  }
}

function hasInvalidLabelCharacters(value: string): boolean {
  for (const character of INVALID_LABEL_CHARACTERS) {
    if (value.includes(character)) {
      return true;
    }
  }

  return false;
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
