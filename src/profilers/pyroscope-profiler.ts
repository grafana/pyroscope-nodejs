import { SourceMapper as DDSourceMapper } from '@datadog/pprof';

import { PyroscopeApiExporter } from '../pyroscope-api-exporter.js';
import { PyroscopeConfig } from '../pyroscope-config.js';
import { SourceMapper } from '../sourcemapper.js';
import { ContinuousProfiler } from './continuous-profiler.js';
import { HeapProfiler, HeapProfilerStartArgs } from './heap-profiler.js';
import { WallProfiler, WallProfilerStartArgs } from './wall-profiler.js';

const MICROS_PER_SECOND = 1e6;
const MS_PER_SECOND = 1e3;
const B_PER_MB = 1024;

const DEFAULT_FLUSH_DURATION_MS = 60000;

const DEFAULT_SAMPLING_DURATION_SECONDS = 60;
const DEFAULT_SAMPLING_DURATION_MS =
  MS_PER_SECOND * DEFAULT_SAMPLING_DURATION_SECONDS;

const DEFAULT_SAMPLING_HZ = 100;
const DEFAULT_SAMPLING_INTERVAL_MICROS =
  MICROS_PER_SECOND / DEFAULT_SAMPLING_HZ;

const DEFAULT_SAMPLING_INTERVAL_MB = 512;
const DEFAULT_SAMPLING_INTERVAL_BYTES = B_PER_MB * DEFAULT_SAMPLING_INTERVAL_MB;

const DEFAULT_STACK_DEPTH = 64;

const DEFAULT_APP_NAME = '';
const DEFAULT_SERVER_ADDRESS = 'http://localhost:4040';

export class PyroscopeProfiler {
  public readonly heapProfiler: ContinuousProfiler<HeapProfilerStartArgs>;
  public readonly wallProfiler: ContinuousProfiler<WallProfilerStartArgs>;

  constructor(config: PyroscopeConfig) {
    const exporter: PyroscopeApiExporter =
      this.initializePyroscopeApiExporter(config);

    this.heapProfiler = this.initializeHeapProfiler(config, exporter);
    this.wallProfiler = this.initializeWallProfiler(config, exporter);
  }

  private buildApplicationName(config: PyroscopeConfig): string {
    const appName: string = config.appName ?? DEFAULT_APP_NAME;
    const tagsStringified: string = Object.entries(config.tags ?? {})
      .map(
        ([tagKey, tagValue]: [string, number | string]) =>
          `${tagKey}=${tagValue}`
      )
      .join(',');

    return `${appName}{${tagsStringified}}`;
  }

  private calculateFlushIntervalMs(config: PyroscopeConfig): number {
    return config.flushIntervalMs ?? DEFAULT_FLUSH_DURATION_MS;
  }

  private initializePyroscopeApiExporter(
    config: PyroscopeConfig
  ): PyroscopeApiExporter {
    return new PyroscopeApiExporter(
      this.buildApplicationName(config),
      config.authToken,
      config.serverAddress ?? DEFAULT_SERVER_ADDRESS,
      config
    );
  }

  private initializeHeapProfiler(
    config: PyroscopeConfig,
    exporter: PyroscopeApiExporter
  ): ContinuousProfiler<HeapProfilerStartArgs> {
    const flushIntervalMs: number = this.calculateFlushIntervalMs(config);

    return new ContinuousProfiler({
      exporter,
      flushIntervalMs: flushIntervalMs,
      profiler: new HeapProfiler(),
      startArgs: {
        sourceMapper: this.toDDSourceMapper(config.sourceMapper),
        samplingIntervalBytes:
          config.heap?.samplingIntervalBytes ?? DEFAULT_SAMPLING_INTERVAL_BYTES,
        stackDepth: config.heap?.stackDepth ?? DEFAULT_STACK_DEPTH,
      },
    });
  }

  private initializeWallProfiler(
    config: PyroscopeConfig,
    exporter: PyroscopeApiExporter
  ): ContinuousProfiler<WallProfilerStartArgs> {
    const flushIntervalMs: number = this.calculateFlushIntervalMs(config);

    return new ContinuousProfiler({
      exporter,
      flushIntervalMs: flushIntervalMs,
      profiler: new WallProfiler(),
      startArgs: {
        sourceMapper: this.toDDSourceMapper(config.sourceMapper),
        samplingDurationMs:
          config.wall?.samplingDurationMs ?? DEFAULT_SAMPLING_DURATION_MS,
        samplingIntervalMicros:
          config.wall?.samplingIntervalMicros ??
          DEFAULT_SAMPLING_INTERVAL_MICROS,
        collectCpuTime: config.wall?.collectCpuTime ?? false,
      },
    });
  }

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
  private toDDSourceMapper(
    sourceMapper: SourceMapper | undefined
  ): DDSourceMapper | undefined {
    if (!sourceMapper) {
      return undefined;
    }

    return sourceMapper as unknown as DDSourceMapper;
  }
}
