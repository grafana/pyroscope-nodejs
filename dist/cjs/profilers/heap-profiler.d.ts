import { SourceMapper } from '@datadog/pprof';
import { ProfileExport } from '../profile-exporter';
import { Profiler } from './profiler';
export interface HeapProfilerStartArgs {
    samplingIntervalBytes: number;
    stackDepth: number;
    sourceMapper: SourceMapper | undefined;
}
export declare class HeapProfiler implements Profiler<HeapProfilerStartArgs> {
    private lastProfiledAt;
    private sourceMapper;
    constructor();
    getLabels(): Record<string, number | string>;
    wrapWithLabels(): void;
    profile(): ProfileExport;
    setLabels(): void;
    start(args: HeapProfilerStartArgs): void;
    stop(): null;
}
