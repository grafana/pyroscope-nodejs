import { PyroscopeConfig } from '../pyroscope-config.js';
import { ContinuousProfiler } from './continuous-profiler.js';
import { HeapProfilerStartArgs } from './heap-profiler.js';
import { WallProfilerStartArgs } from './wall-profiler.js';
export declare class PyroscopeProfiler {
    readonly heapProfiler: ContinuousProfiler<HeapProfilerStartArgs>;
    readonly wallProfiler: ContinuousProfiler<WallProfilerStartArgs>;
    constructor(config: PyroscopeConfig);
    private buildApplicationName;
    private calculateFlushIntervalMs;
    private initializePyroscopeApiExporter;
    private initializeHeapProfiler;
    private initializeWallProfiler;
    /**
     * Converts a (Pyroscope) `SourceMapper` to a (DataDog) `SourceMapper`. These
     * two types have the same shape, but since the DataDog SourceMapper has a
     * private field `getMappingInfo`, we cannot use these two classes
     * interchangeably.
     *
     * For a more detailed explanation as to why the private method makes the
     * typical TypeScript type conversion impossible, see:
     *
     * https://github.com/microsoft/TypeScript/issues/7755#issuecomment-204161372
     *
     * @param sourceMapper A Pyroscope `SourceMapper`.
     * @return A DataDog `SourceMapper`.
     */
    private toDDSourceMapper;
}
