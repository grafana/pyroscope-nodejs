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
  context?: object;
  timestamp: bigint;
  cpuTime?: number;
  asyncId?: number;
}

export interface ProfilerContext {
  labels?: LabelSet;
}

export class WallProfiler implements Profiler<WallProfilerStartArgs> {
  private lastProfiledAt: Date;
  private lastContext: ProfilerContext;
  private lastSamplingIntervalMicros!: number;

  constructor(private readonly asyncContext = false) {
    this.lastContext = {};
    this.lastProfiledAt = new Date();
  }

  public getLabels(): LabelSet {
    if (this.asyncContext) {
      const context: ProfilerContext | undefined = time.isStarted()
        ? time.getContext()
        : undefined;
      return context?.labels ?? {};
    }
    return this.lastContext.labels ?? {};
  }

  public profile(): ProfileExport {
    log('profile');
    return this.innerProfile(true);
  }

  public wrapWithLabels<R, TArgs extends unknown[]>(
    lbls: LabelSet,
    fn: (...args: TArgs) => R,
    ...args: TArgs
  ): R {
    const oldLabels = this.getLabels();
    const labels = { ...oldLabels, ...lbls };
    if (this.asyncContext) {
      return time.runWithContext({ labels }, fn, ...args);
    }
    this.setLabels(labels);
    try {
      return fn(...args);
    } finally {
      this.setLabels({ ...oldLabels });
    }
  }

  public setLabels(labels: LabelSet): void {
    if (this.asyncContext) {
      throw new Error(
        'setLabels is not supported with wall.asyncContext; use wrapWithLabels instead'
      );
    }
    this.newContext({
      labels: labels,
    });
  }

  public start(args: WallProfilerStartArgs): void {
    if (time.isStarted()) {
      if (this.asyncContext) {
        this.checkAsyncContext();
      }
    } else {
      log('start');

      this.lastProfiledAt = new Date();
      this.lastSamplingIntervalMicros = args.samplingDurationMs;
      try {
        time.start({
          sourceMapper: args.sourceMapper,
          durationMillis: args.samplingDurationMs,
          intervalMicros: args.samplingIntervalMicros,
          withContexts: true,
          useCPED: this.asyncContext,
          workaroundV8Bug: true,
          collectCpuTime: args.collectCpuTime,
        });
        if (this.asyncContext) {
          this.checkAsyncContext();
        } else {
          this.newContext({});
        }
      } catch (error) {
        if (time.isStarted()) {
          time.stop();
        }
        if (this.asyncContext) {
          throw new Error(
            'wall.asyncContext requires native AsyncContextFrame support. ' +
              'On Node.js 22, enable --experimental-async-context-frame; ' +
              'on Node.js 24+, do not disable AsyncContextFrame. ' +
              'Otherwise leave wall.asyncContext disabled.',
            { cause: error }
          );
        }
        throw error;
      }
    }
  }

  private checkAsyncContext(): void {
    // useCPED can start successfully even when V8 cannot read its contexts.
    const context: ProfilerContext = {};
    const supported = time.runWithContext(
      context,
      () => time.getContext() === context
    );
    if (!supported) {
      throw new Error('The native profiler could not read the scoped context');
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
    const context = args.context?.context as ProfilerContext | undefined;
    return { ...(context?.labels ?? {}) };
  }

  private innerProfile(restart: boolean): ProfileExport {
    if (!this.asyncContext) {
      this.newContext({});
    }
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
