export interface Environment {
    adhocServerAddress: string | undefined;
    appName: string | undefined;
    authToken: string | undefined;
    flushIntervalMs: number | undefined;
    heapSamplingIntervalBytes: number | undefined;
    heapStackDepth: number | undefined;
    serverAddress: string | undefined;
    wallSamplingDurationMs: number | undefined;
    wallSamplingIntervalMicros: number | undefined;
    wallCollectCpuTime: boolean | undefined;
}
