import * as pprof from '@datadog/pprof'
import { perftools } from '@datadog/pprof/proto/profile'
import { fixNanosecondsPeriod } from './cpu'
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

const wallSampleTypeConfig = `{
    "samples": {
        "display-name": "wall",
        "units": "samples",
        "sampled": true
    }
}`

let _isWallProfilingRunning = false

export function isWallProfilingRunning(): boolean {
  return _isWallProfilingRunning
}

export async function collectWall(seconds?: number): Promise<Buffer> {
  if (!config.configured) {
    throw 'Pyroscope is not configured. Please call init() first.'
  }

  try {
    _isWallProfilingRunning = true
    const profile = await pprof.time.profile({
      lineNumbers: true,
      sourceMapper: config.sm,
      durationMillis: (seconds || 10) * 1000 || Number(SAMPLING_DURATION_MS), // https://github.com/google/pprof-nodejs/blob/0eabf2d9a4e13456e642c41786fcb880a9119f28/ts/src/time-profiler.ts#L35-L36
      intervalMicros: Number(SAMPLING_INTERVAL_MS) * 1000, // https://github.com/google/pprof-nodejs/blob/0eabf2d9a4e13456e642c41786fcb880a9119f28/ts/src/time-profiler.ts#L37-L38
    })
    stopWallProfiling()
    const newProfile = processProfile(fixNanosecondsPeriod(profile))
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

export function processCpuProfile(
  profile?: perftools.profiles.IProfile
): perftools.profiles.IProfile {
  return { ...profile, period: 10000000 }
}

export function startWallProfiling(): void {
  checkConfigured()

  log('Pyroscope has started Wall Profiling')
  _isWallProfilingRunning = true
  const profilingRound = () => {
    log('Collecting Wall Profile')
    pprof.time
      .profile({
        lineNumbers: true,
        sourceMapper: config.sm,
        durationMillis: Number(SAMPLING_DURATION_MS),
        intervalMicros: Number(SAMPLING_INTERVAL_MS) * 1000,
      })
      .then((profile) => {
        log('Wall Profile collected')
        emitter.emit('profile', profile)
        if (_isWallProfilingRunning) {
          setImmediate(profilingRound)
        }
        log('Wall Profile uploading')

        return uploadProfile(
          fixNanosecondsPeriod(profile),
          wallSampleTypeConfig
        )
      })
      .then((d) => {
        log('Wall Profile has been uploaded')
      })
      .catch((e) => {
        log(e)
      })
  }
  profilingRound()
}

// It doesn't stop it immediately, just wait until it ends
export function stopWallProfiling(): void {
  _isWallProfilingRunning = false
  ;(process as any)._stopProfilerIdleNotifier()
}
