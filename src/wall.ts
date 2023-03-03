import * as pprof from '@datadog/pprof'

import {
  config,
  processProfile,
  log,
  SAMPLING_INTERVAL_MS,
  SAMPLING_DURATION_MS,
  checkConfigured,
  uploadProfile,
  emitter,
} from './index'
import {
  ContinuousProfiler,
  ProfilerImpl,
  PyroscopeApiExporter,
} from './continuous'
import { Profile } from 'pprof-format'

const wallSampleTypeConfig = `{
    "samples": {
        "display-name": "wall",
        "units": "samples",
        "sampled": true
    }
}`

class WallProfilerImpl implements ProfilerImpl {
  private readonly samplingIntervalMicros: number
  private stopCallback: undefined | ((restart?: boolean) => Profile)

  constructor(samplingIntervalMicros: number) {
    this.samplingIntervalMicros = samplingIntervalMicros
  }

  profile(): Profile | undefined {
    if (!this.stopCallback) {
      log('not started')
      return undefined
    }
    log('profile')
    return this.stopCallback(true)
  }

  start(): void {
    this.stopCallback = pprof.time.start(
      this.samplingIntervalMicros,
      undefined,
      config.sm,
      false
    )
  }

  stop(): void {
    if (!this.stopCallback) {
      log('not started')
      return undefined
    }
    this.stopCallback(false)
    this.stopCallback = undefined
  }
}

const continuousWallProfiler = new ContinuousProfiler({
  profiler: new WallProfilerImpl(SAMPLING_INTERVAL_MS * 1000),
  exporter: new PyroscopeApiExporter(wallSampleTypeConfig),
  name: 'wall',
  duration: SAMPLING_DURATION_MS,
})

export function startWallProfiling(): void {
  checkConfigured()

  continuousWallProfiler.start()
}

export function stopWallProfiling(): Promise<void> {
  return continuousWallProfiler.stop()
}

export async function collectWall(seconds?: number): Promise<Buffer> {
  if (!config.configured) {
    throw 'Pyroscope is not configured. Please call init() first.'
  }

  try {
    const profile = await pprof.time.profile({
      lineNumbers: true,
      sourceMapper: config.sm,
      durationMillis: (seconds || 10) * 1000 || Number(SAMPLING_DURATION_MS), // https://github.com/google/pprof-nodejs/blob/0eabf2d9a4e13456e642c41786fcb880a9119f28/ts/src/time-profiler.ts#L35-L36
      intervalMicros: Number(SAMPLING_INTERVAL_MS) * 1000, // https://github.com/google/pprof-nodejs/blob/0eabf2d9a4e13456e642c41786fcb880a9119f28/ts/src/time-profiler.ts#L37-L38
    })
    const newProfile = processProfile(profile)
    if (newProfile) {
      emitter.emit('profile', profile)

      return pprof.encode(newProfile)
    } else {
      return Buffer.from('', 'utf8')
    }
  } catch (e) {
    log(e)
    return Buffer.from('', 'utf8')
  }
}
