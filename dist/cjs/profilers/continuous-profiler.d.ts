import { ProfileExporter } from '../profile-exporter.js';
import { Profiler } from './profiler.js';
export interface ContinuousProfilerInput<TStartArgs> {
    exporter: ProfileExporter;
    flushIntervalMs: number;
    profiler: Profiler<TStartArgs>;
    startArgs: TStartArgs;
}
export declare class ContinuousProfiler<TStartArgs> {
    readonly profiler: Profiler<TStartArgs>;
    private readonly exporter;
    private readonly flushIntervalMs;
    readonly startArgs: TStartArgs;
    private timer;
    private lastExport;
    constructor(input: ContinuousProfilerInput<TStartArgs>);
    start(): void;
    stop(): Promise<void>;
    private scheduleProfilingRound;
    private profilingRound;
}
