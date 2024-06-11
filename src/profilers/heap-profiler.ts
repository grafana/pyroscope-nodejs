import { heap, SourceMapper } from '@datadog/pprof';
import { Profile } from 'pprof-format';

import { ProfileExport } from '../profile-exporter';
import { Profiler } from './profiler';
import debug from 'debug';

const log = debug('pyroscope::profiler::heap');

export interface HeapProfilerStartArgs {
  samplingIntervalBytes: number;
  stackDepth: number;
  sourceMapper: SourceMapper | undefined;
}

export class HeapProfiler implements Profiler<HeapProfilerStartArgs> {
  private lastProfiledAt: Date;
  private sourceMapper: SourceMapper | undefined;

  constructor() {
    this.lastProfiledAt = new Date();
  }

  public getLabels(): Record<string, number | string> {
    throw new Error("heap profiler doesn't support labels");
  }

  public wrapWithLabels(): void {
    throw new Error("heap profiler doesn't support labels");
  }

  public profile(): ProfileExport {
    log('profile');

    const profile: Profile = heap.profile(
      undefined,
      this.sourceMapper,
      undefined
    );

    const lastProfileStartedAt: Date = this.lastProfiledAt;
    this.lastProfiledAt = new Date();

    return {
      profile,
      startedAt: lastProfileStartedAt,
      stoppedAt: this.lastProfiledAt,
    };
  }

  public setLabels(): void {
    throw new Error("heap profiler doesn't support labels");
  }

  public start(args: HeapProfilerStartArgs): void {
    log('start');

    this.lastProfiledAt = new Date();
    this.sourceMapper = args.sourceMapper;
    heap.start(args.samplingIntervalBytes, args.stackDepth);
  }

  public stop(): null {
    log('stop');

    heap.stop();

    return null;
  }
}
