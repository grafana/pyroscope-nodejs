import { SourceMapper, LabelSet, TimeProfileNode } from '@datadog/pprof';
import { ProfileExport } from '../profile-exporter.js';
import { Profiler } from './profiler.js';
export interface WallProfilerStartArgs {
    samplingDurationMs: number;
    samplingIntervalMicros: number;
    sourceMapper: SourceMapper | undefined;
    collectCpuTime: boolean;
}
export interface GenerateTimeLabelsArgs {
    node: TimeProfileNode;
    context?: TimeProfileNodeContext;
}
export interface TimeProfileNodeContext {
    context?: object;
    timestamp: bigint;
    cpuTime?: number;
    asyncId?: number;
}
export interface ProfilerContext {
    labels?: LabelSet;
}
export declare class WallProfiler implements Profiler<WallProfilerStartArgs> {
    private lastProfiledAt;
    private lastContext;
    private lastSamplingIntervalMicros;
    constructor();
    getLabels(): LabelSet;
    profile(): ProfileExport;
    wrapWithLabels(lbls: LabelSet, fn: () => void, ...args: unknown[]): void;
    setLabels(labels: LabelSet): void;
    start(args: WallProfilerStartArgs): void;
    stop(): ProfileExport;
    private newContext;
    private generateLabels;
    private innerProfile;
}
