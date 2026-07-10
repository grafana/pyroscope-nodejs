import { LabelSet } from '@datadog/pprof';
import { SourceMapper } from './sourcemapper.js';

export type { LabelSet } from '@datadog/pprof';

export interface PyroscopeConfig {
  appName?: string | undefined;
  authToken?: string | undefined;
  flushIntervalMs?: number | undefined;
  heap?: PyroscopeHeapConfig | undefined;
  serverAddress?: string | undefined;
  tags?: LabelSet | undefined;
  wall?: PyroscopeWallConfig | undefined;
  sourceMapper?: SourceMapper | undefined;
  basicAuthUser?: string | undefined;
  basicAuthPassword?: string | undefined;
  tenantID?: string | undefined;
  stripFilenames?: StripFilenamesMode | undefined;
  shortenPaths?: boolean | undefined;
}

// 'all' removes the filename from every function, 'dependencies' only from
// functions in files under node_modules. Function names generated for the
// flame graph keep the file path either way; what is lost is the structured
// filename field used to link frames to source code (e.g. the GitHub
// integration in Grafana).
export type StripFilenamesMode = 'all' | 'dependencies';

export interface PyroscopeWallConfig {
  samplingDurationMs?: number | undefined;
  samplingIntervalMicros?: number | undefined;
  collectCpuTime?: boolean | undefined;
}

export interface PyroscopeHeapConfig {
  samplingIntervalBytes?: number | undefined;
  stackDepth?: number | undefined;
}

// deprecated: use LabelSet instead
export type TagList = LabelSet;
