/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { CpuProfiler, encode } from '@datadog/pprof'
import debug from 'debug'
import {
  checkConfigured,
  config,
  emitter,
  processProfile,
  SAMPLING_DURATION_MS,
  SAMPLING_INTERVAL_MS,
} from './index'
import {
  ContinuousProfiler,
  ProfilerImpl,
  PyroscopeApiExporter,
} from './continuous'
import { Profile } from 'pprof-format'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShamefulAny = any

const log = debug('pyroscope::cpu')

const cpuProfiler = new CpuProfiler()

export class CPUProfilerImpl implements ProfilerImpl {
  private profiler: any
  private started = false

  constructor(profiler: any) {
    this.profiler = profiler
  }

  profile(): Profile | undefined {
    log('profile')
    return this.profiler.profile()
  }

  start(): void {
    if (this.started) {
      log('already started')
      return
    }
    log('start')
    this.started = true
    const freq = 1000.0 / Number(SAMPLING_INTERVAL_MS)
    this.profiler.start(freq)
  }

  stop(): void {
    if (!this.started) {
      log('not started')
      return
    }
    log('stop')
    this.started = false
    // todo(korniltsev) it looks like this stop does not wait for the profiler interrupting thread to join
    this.profiler.stop()
  }
}

const continuousCpuProfiler = new ContinuousProfiler({
  profiler: new CPUProfilerImpl(cpuProfiler),
  exporter: new PyroscopeApiExporter(),
  name: 'cpu',
  duration: SAMPLING_DURATION_MS,
})

export function startCpuProfiling() {
  checkConfigured()

  continuousCpuProfiler.start()
}

export function stopCpuProfiling(): Promise<void> {
  return continuousCpuProfiler.stop()
}

// This is in conflict with pprof typings. Not sure why
export function setCpuLabels(labels: Record<string, unknown>) {
  cpuProfiler.labels = labels
}

export function getCpuLabels(): unknown {
  return cpuProfiler.labels
}

export function tag(key: string, value: number | string | undefined) {
  cpuProfiler.labels = { ...cpuProfiler.labels, [key]: value }
}

export function tagWrapper(
  tags: Record<string, string | number | undefined>,
  fn: () => void,
  ...args: unknown[]
) {
  cpuProfiler.labels = { ...cpuProfiler.labels, ...tags }
  ;(fn as ShamefulAny)(...args)
  Object.keys(tags).forEach((key) => {
    cpuProfiler.labels = { ...cpuProfiler.labels, [key]: undefined }
  })
}

export function collectCpu(seconds: number): Promise<Buffer> {
  if (!config.configured) {
    throw 'Pyroscope is not configured. Please call init() first.'
  }
  log('Pyroscope has started CPU Profiling')
  const freq = 1000.0 / Number(SAMPLING_INTERVAL_MS)
  cpuProfiler.start(freq)

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      log('Collecting cpu profile')
      const profile = cpuProfiler.profile()
      if (profile) {
        log('Cpu profile collected. Now processing')
        const newProfile = processProfile(profile)
        if (newProfile) {
          log('Processed profile. Now encoding to pprof format')
          emitter.emit('profile', newProfile)
          return encode(newProfile)
            .then((profile) => {
              log('Encoded profile. Stopping cpu profiling')
              cpuProfiler.stop()
              return resolve(profile)
            })
            .catch((e) => {
              log('Error while encoding profile')
              return new Buffer('', 'utf-8')
            })
        }
      } else {
        log('Cpu profile collection failed')
      }

      log('Stopping cpuProfiler')
      cpuProfiler.stop()
      reject(new Buffer('', 'utf-8'))
    }, seconds * 1000)
  })
}
