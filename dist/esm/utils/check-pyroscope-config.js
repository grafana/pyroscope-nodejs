export function checkPyroscopeConfig(config) {
    if (!isObject(config)) {
        throw new Error('Expecting an object config');
    }
    const errors = [];
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
function hasValidApplicationName(config) {
    return (config.appName === undefined ||
        typeof config.appName === 'string');
}
function hasValidAuthToken(config) {
    return (config.authToken === undefined ||
        typeof config.authToken === 'string');
}
function hasValidFlushInterval(config) {
    return (config.flushIntervalMs === undefined ||
        (typeof config.flushIntervalMs === 'number' &&
            Number.isInteger(config.flushIntervalMs)));
}
function hasValidMemory(config) {
    if (config.heap === undefined) {
        return true;
    }
    const memoryConfig = config.heap;
    if (!isObject(memoryConfig)) {
        return false;
    }
    return (hasValidSamplingIntervalBytes(memoryConfig) &&
        hasValidStackDepth(memoryConfig));
}
function hasValidSamplingDurationMs(wallConfig) {
    return (wallConfig.samplingDurationMs ===
        undefined ||
        (typeof wallConfig.samplingDurationMs ===
            'number' &&
            Number.isInteger(wallConfig.samplingDurationMs)));
}
function hasValidSamplingIntervalBytes(memoryConfig) {
    return (memoryConfig.samplingIntervalBytes ===
        undefined ||
        typeof memoryConfig
            .samplingIntervalBytes === 'number');
}
function hasValidSamplingIntervalMicros(wallConfig) {
    return (wallConfig.samplingIntervalMicros ===
        undefined ||
        (typeof wallConfig
            .samplingIntervalMicros === 'number' &&
            Number.isInteger(wallConfig.samplingIntervalMicros)));
}
function hasValidStackDepth(memoryConfig) {
    return (memoryConfig.stackDepth === undefined ||
        typeof memoryConfig.stackDepth ===
            'number');
}
function hasValidServerAddress(config) {
    return (config.serverAddress === undefined ||
        typeof config.serverAddress === 'string');
}
function hasValidWall(config) {
    if (config.wall === undefined) {
        return true;
    }
    const wallConfig = config.wall;
    if (!isObject(wallConfig)) {
        return false;
    }
    return (hasValidSamplingDurationMs(wallConfig) &&
        hasValidSamplingIntervalMicros(wallConfig));
}
function isObject(object) {
    return object !== null && typeof object === 'object';
}
