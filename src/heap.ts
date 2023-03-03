import * as pprof from '@datadog/pprof'
import {
  config,
  processProfile,
  checkConfigured,
  SAMPLING_DURATION_MS,
  HEAP_INTERVAL_BYTES,
  HEAP_STACK_DEPTH,
} from './index'
import {
  ContinuousProfiler,
  ProfilerImpl,
  PyroscopeApiExporter,
} from './continuous'
import { Profile } from 'pprof-format'
import debug from 'debug'

export const log = debug('pyroscope::heap')

export class HeapProfilerImpl implements ProfilerImpl {
  private started = false

  profile(): Profile {
    log('profile')
    return pprof.heap.profile(undefined, config.sm)
  }

  start(): void {
    if (this.started) {
      log('already started')
      return
    }
    log('start')
    this.started = true
    pprof.heap.start(HEAP_INTERVAL_BYTES, HEAP_STACK_DEPTH)
  }

  stop(): void {
    if (!this.started) {
      log('not started')
      return
    }
    log('stop')
    this.started = false
    pprof.heap.stop()
  }
}

const heapProfilerImpl = new HeapProfilerImpl()

const continuousHeapProfiler = new ContinuousProfiler({
  profiler: heapProfilerImpl,
  exporter: new PyroscopeApiExporter(),
  name: 'heap',
  duration: SAMPLING_DURATION_MS,
})

export function startHeapProfiling(): void {
  checkConfigured()

  continuousHeapProfiler.start()
}

export function stopHeapProfiling(): Promise<void> {
  return continuousHeapProfiler.stop()
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

export function startHeapCollecting() {
  if (!config.configured) {
    throw 'Pyroscope is not configured. Please call init() first.'
  }

  heapProfilerImpl.start()
}

export function stopHeapCollecting() {
  heapProfilerImpl.stop()
}
