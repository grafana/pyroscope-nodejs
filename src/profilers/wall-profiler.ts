import { time, SourceMapper, LabelSet, TimeProfileNode } from '@datadog/pprof';
import { Profile } from 'pprof-format';

import { ProfileExport } from '../profile-exporter.js';
import { Profiler } from './profiler.js';
import debug from 'debug';

const MICROS_PER_SECOND = 1e6;

const log = debug('pyroscope::profiler::wall');

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
  context: ProfilerContext;
  timestamp: bigint;
  cpuTime: number;
}

export interface ProfilerContext {
  labels?: LabelSet;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyWrappedCallback = any;

export class WallProfiler implements Profiler<WallProfilerStartArgs> {
  private lastProfiledAt: Date;
  private lastContext: ProfilerContext;
  private lastSamplingIntervalMicros!: number;

  constructor() {
    this.lastContext = {};
    this.lastProfiledAt = new Date();
  }

  public getLabels(): LabelSet {
    return this.lastContext.labels ?? {};
  }

  public profile(): ProfileExport {
    log('profile');
    return this.innerProfile(true);
  }

  public wrapWithLabels(
    lbls: LabelSet,
    fn: () => void,
    ...args: unknown[]
  ): void {
    const oldLabels = this.getLabels();
    this.setLabels({
      ...oldLabels,
      ...lbls,
    });
    (fn as AnyWrappedCallback)(...args);
    this.setLabels({
      ...oldLabels,
    });
  }

  public setLabels(labels: LabelSet): void {
    this.newContext({
      labels: labels,
    });
  }

  public start(args: WallProfilerStartArgs): void {
    if (!time.isStarted()) {
      log('start');

      this.lastProfiledAt = new Date();
      this.lastSamplingIntervalMicros = args.samplingDurationMs;
      time.start({
        sourceMapper: args.sourceMapper,
        durationMillis: args.samplingDurationMs,
        intervalMicros: args.samplingIntervalMicros,
        withContexts: true,
        workaroundV8Bug: true,
        collectCpuTime: args.collectCpuTime,
      });
      this.newContext({});
    }
  }

  public stop(): ProfileExport {
    log('stop');
    return this.innerProfile(false);
  }

  private newContext(o: ProfilerContext) {
    this.lastContext = o;
    time.setContext(o);
  }

  private generateLabels(args: GenerateTimeLabelsArgs): LabelSet {
    return { ...(args.context?.context?.labels ?? {}) };
  }

  private innerProfile(restart: boolean): ProfileExport {
    this.newContext({});
    const profile: Profile = time.stop(restart, this.generateLabels);

    const lastProfileStartedAt: Date = this.lastProfiledAt;
    this.lastProfiledAt = new Date();

    return {
      profile,
      sampleRate: Math.ceil(
        MICROS_PER_SECOND / this.lastSamplingIntervalMicros
      ),
      startedAt: lastProfileStartedAt,
      stoppedAt: this.lastProfiledAt,
    };
  }
}
