import { ContinuousProfiler } from './continuous-profiler';
import { WallProfilerStartArgs } from './wall-profiler';
import { HeapProfilerStartArgs } from './heap-profiler';
import { PyroscopeConfig } from '../pyroscope-config';
export declare class PyroscopeProfiler {
    readonly heapProfiler: ContinuousProfiler<HeapProfilerStartArgs>;
    readonly wallProfiler: ContinuousProfiler<WallProfilerStartArgs>;
    constructor(config: PyroscopeConfig);
    private buildApplicationName;
    private calculateFlushIntervalMs;
    private initializePyroscopeApiExporter;
    private initializeHeapProfiler;
    private initializeWallProfiler;
}
