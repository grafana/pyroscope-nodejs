import * as pprof from '@datadog/pprof'
import {
  config,
  processProfile,
  checkConfigured,
  uploadProfile,
  SAMPLING_DURATION_MS,
  log,
  emitter,
} from './index'
import {Profile} from "pprof-format";

// Could be false or a function to stop heap profiling
let heapProfilingTimer: undefined | NodeJS.Timer = undefined

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

let isHeapCollectingStarted = false

export function startHeapCollecting() {
  if (!config.configured) {
    throw 'Pyroscope is not configured. Please call init() first.'
  }

  if (isHeapCollectingStarted) {
    log('Heap collecting is already started')
    return
  }

  const intervalBytes = 1024 * 512
  const stackDepth = 32

  log('Pyroscope has started heap profiling')

  pprof.heap.start(intervalBytes, stackDepth)
  isHeapCollectingStarted = true
}

export function startHeapProfiling(): void {
  checkConfigured()

  if (heapProfilingTimer) {
    log('Pyroscope has already started heap profiling')
    return
  }

  startHeapCollecting()

  heapProfilingTimer = setInterval(() => {
    log('Collecting heap profile')
    const profile = pprof.heap.profile(undefined, config.sm)
    emitter.emit('profile', profile)

    log('Heap profile collected...')
    uploadProfile(profile).then(() => log('Heap profile uploaded...'))
  }, Number(SAMPLING_DURATION_MS))
}

export function stopHeapCollecting() {
  pprof.heap.stop()
  isHeapCollectingStarted = false
}

export function stopHeapProfiling(): Promise<void> {
  log('Stopping heap profiling')
  return new Promise<void>(async (resolve, reject) => {
    if (heapProfilingTimer) {
      clearInterval(heapProfilingTimer)
      try {
        const profile = pprof.heap.profile(undefined, config.sm)
        emitter.emit('profile', profile)
        log(`uploading heap profile`)
        await uploadProfile(profile)
        log(`uploaded heap profile`)
      } catch (e) {
        log(`failed to capture last profile during stop: ${e}`)
      }
      heapProfilingTimer = undefined
      stopHeapCollecting()
      resolve()
    } else {
      reject()
    }
  })
}
