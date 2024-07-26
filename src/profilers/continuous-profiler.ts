import debug from 'debug';
import { ProfileExport, ProfileExporter } from '../profile-exporter';
import { Profiler } from './profiler';

const log = debug('pyroscope::profiler');

export interface ContinuousProfilerInput<TStartArgs> {
  exporter: ProfileExporter;
  flushIntervalMs: number;
  profiler: Profiler<TStartArgs>;
  startArgs: TStartArgs;
}

export class ContinuousProfiler<TStartArgs> {
  public readonly profiler: Profiler<TStartArgs>;
  private readonly exporter: ProfileExporter;
  private readonly flushIntervalMs: number;
  readonly startArgs: TStartArgs;
  private timer: NodeJS.Timeout | undefined;
  private lastExport: Promise<void> | undefined;

  constructor(input: ContinuousProfilerInput<TStartArgs>) {
    this.exporter = input.exporter;
    this.flushIntervalMs = input.flushIntervalMs;
    this.profiler = input.profiler;
    this.startArgs = input.startArgs;
  }

  public start(): void {
    if (this.timer !== undefined) {
      log('already started');
      return;
    }

    log('start');
    this.profiler.start(this.startArgs);
    this.scheduleProfilingRound();
  }

  public async stop(): Promise<void> {
    if (this.timer === undefined) {
      log('already stopped');
      return;
    }

    log('stopping');

    clearTimeout(this.timer);
    this.timer = undefined;

    if (this.lastExport !== undefined) {
      await this.lastExport;
    }

    try {
      const profileExport: ProfileExport | null = this.profiler.stop();

      if (profileExport !== null) {
        log('profile exporting');

        await this.exporter.export(profileExport);
      }
    } catch (e: unknown) {
      log(`failed to capture last profile during stop: ${e as string}`);
    }
  }

  private scheduleProfilingRound() {
    this.timer = setTimeout(() => {
      setImmediate(() => {
        void this.profilingRound();
        this.scheduleProfilingRound();
      });
    }, this.flushIntervalMs);
  }

  private async profilingRound(): Promise<void> {
    const profileExport: ProfileExport = this.profiler.profile();

    if (this.lastExport === undefined) {
      this.lastExport = this.exporter.export(profileExport).catch();

      await this.lastExport;
      this.lastExport = undefined;
    }
  }
}
