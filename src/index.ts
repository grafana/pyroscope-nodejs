import 'regenerator-runtime/runtime'

import expressMiddleware from './express/middleware'
import { PyroscopeProfiler } from './profilers/pyroscope-profiler'
import {
  PyroscopeConfig,
  PyroscopeHeapConfig,
  PyroscopeWallConfig,
} from './pyroscope-config'
import { checkPyroscopeConfig } from './utils/check-pyroscope-config'
import { getProfiler, setProfiler } from './utils/pyroscope-profiler'
import { processConfig } from './utils/process-config'
import { getEnv } from './utils/get-env'

export function init(config: PyroscopeConfig = {}): void {
  checkPyroscopeConfig(config)

  const processedConfig: PyroscopeConfig = processConfig(config, getEnv())

  setProfiler(new PyroscopeProfiler(processedConfig))
}

function getWallLabels(): Record<string, number | string> {
  return getProfiler().wallProfiler.profiler.getLabels()
}

function setWallLabels(labels: Record<string, number | string>): void {
  getProfiler().wallProfiler.profiler.setLabels(labels)
}

function startWallProfiling(): void {
  getProfiler().wallProfiler.start()
}

async function stopWallProfiling(): Promise<void> {
  await getProfiler().wallProfiler.stop()
}

function startHeapProfiling(): void {
  getProfiler().heapProfiler.start()
}

async function stopHeapProfiling(): Promise<void> {
  await getProfiler().heapProfiler.stop()
}

// Could be false or a function to stop heap profiling
let heapProfilingTimer: NodeJS.Timeout | undefined = undefined
let isWallProfilingRunning = false

export async function collectCpu(seconds?: number): Promise<Buffer> {
  if (!config.configured) {
    throw 'Pyroscope is not configured. Please call init() first.'
  }

  try {
    const profile = await pprof.time.profile({
      lineNumbers: true,
      sourceMapper: config.sm,
      durationMillis: (seconds || 10) * 1000 || Number(SAMPLING_DURATION_MS), // https://github.com/google/pprof-nodejs/blob/0eabf2d9a4e13456e642c41786fcb880a9119f28/ts/src/time-profiler.ts#L35-L36
      intervalMicros: Number(SAMPLING_INTERVAL_MS)*1000, // https://github.com/google/pprof-nodejs/blob/0eabf2d9a4e13456e642c41786fcb880a9119f28/ts/src/time-profiler.ts#L37-L38
    })

    const newProfile = processProfile(profile)
    if (newProfile) {
      return pprof.encode(newProfile)
    } else {
      return Buffer.from('', 'utf8')
    }
  } catch (e) {
    log(e)
    return Buffer.from('', 'utf8')
  }
}

export async function collectHeap(): Promise<Buffer> {
  if (!config.configured) {
    throw 'Pyroscope is not configured. Please call init() first.'
  }

  log('Collecting heap...')
  const profile = pprof.heap.profile(undefined, config.sm)
  const newProfile = processProfile(profile)
  if (newProfile) {
    return pprof.encode(newProfile)
  } else {
    return Buffer.from('', 'utf8')
  }
}

function checkConfigured() {
  if (!config.configured) {
    throw 'Pyroscope is not configured. Please call init() first.'
  }

  if (!config.serverAddress) {
    throw 'Please set the server address in the init()'
  }

  if (!config.appName) {
    throw 'Please define app name in the init()'
  }
}

export function startWallProfiling(): void {
  checkConfigured()

  log('Pyroscope has started CPU Profiling')
  isWallProfilingRunning = true

  const profilingRound = () => {
    log('Collecting CPU Profile')
    pprof.time
      .profile({
        lineNumbers: true,
        sourceMapper: config.sm,
        durationMillis: Number(SAMPLING_DURATION_MS),
        intervalMicros: Number(SAMPLING_INTERVAL_MS)*1000,
      })
      .then((profile) => {
        log('CPU Profile collected')
        if (isWallProfilingRunning) {
          setImmediate(profilingRound)
        }
        log('CPU Profile uploading')
        return uploadProfile(profile)
      })
      .then((d) => {
        log('CPU Profile has been uploaded')
      })
      .catch((e) => {
        log(e)
      })
  }
  profilingRound()
}

// It doesn't stop it immediately, just wait until it ends
export function stopWallProfiling(): void {
  isWallProfilingRunning = false
}

export function start(): void {
  startWallProfiling()
  startHeapProfiling()
}

export async function stop(): Promise<void> {
  await Promise.all([stopWallProfiling(), stopHeapProfiling()])
}

export {
  expressMiddleware,
  PyroscopeConfig,
  PyroscopeHeapConfig,
  PyroscopeWallConfig,
}

export default {
  getWallLabels,
  init,
  setWallLabels,
  start,
  startHeapProfiling,
  startWallProfiling,
  stop,
  stopHeapProfiling,
  stopWallProfiling,
}
