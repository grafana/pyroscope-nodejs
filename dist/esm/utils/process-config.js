export function processConfig(config, env) {
    const processedConfig = {
        appName: config.appName ?? env.appName,
        authToken: config.authToken ?? env.authToken,
        flushIntervalMs: config.flushIntervalMs ?? env.flushIntervalMs,
        heap: {
            samplingIntervalBytes: config.heap?.samplingIntervalBytes ?? env.heapSamplingIntervalBytes,
            stackDepth: config.heap?.stackDepth ?? env.heapStackDepth,
        },
        serverAddress: env.adhocServerAddress ?? config.serverAddress ?? env.serverAddress,
        tags: config.tags,
        wall: {
            samplingDurationMs: config.wall?.samplingDurationMs ?? env.wallSamplingDurationMs,
            samplingIntervalMicros: config.wall?.samplingIntervalMicros ?? env.wallSamplingIntervalMicros,
            collectCpuTime: config.wall?.collectCpuTime ?? env.wallCollectCpuTime,
        },
        sourceMapper: config.sourceMapper,
        basicAuthUser: config.basicAuthUser,
        basicAuthPassword: config.basicAuthPassword,
        tenantID: config.tenantID,
    };
    return processedConfig;
}
