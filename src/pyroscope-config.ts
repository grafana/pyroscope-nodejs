export interface PyroscopeConfig {
  appName?: string | undefined
  authToken?: string | undefined
  flushIntervalMs?: number | undefined
  heap?: PyroscopeHeapConfig | undefined
  serverAddress?: string | undefined
  tags?: TagList | undefined
  wall?: PyroscopeWallConfig | undefined
}

export interface PyroscopeWallConfig {
  samplingDurationMs?: number | undefined
  samplingIntervalMicros?: number | undefined
}

export interface PyroscopeHeapConfig {
  samplingIntervalBytes?: number | undefined
  stackDepth?: number | undefined
}

export type TagList = Record<string, number | string>
