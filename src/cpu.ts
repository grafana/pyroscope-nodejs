/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { CpuProfiler, encode } from '@datadog/pprof'
import { perftools } from '@datadog/pprof/proto/profile'
import debug from 'debug'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShamefulAny = any

const log = debug('pyroscope::cpu')

import {
  checkConfigured,
  config,
  emitter,
  SAMPLING_INTERVAL_MS,
  SAMPLING_DURATION_MS,
  processProfile,
  uploadProfile,
} from './index'

const cpuProfiler = new CpuProfiler()

let cpuProfilingTimer: NodeJS.Timer | undefined = undefined

export function isCpuProfilingRunning(): boolean {
  return cpuProfilingTimer !== undefined
}

export function startCpuProfiling() {
  checkConfigured()

  log('Pyroscope has started CPU Profiling')
  const freq = 1000.0 / Number(SAMPLING_INTERVAL_MS)
  cpuProfiler.start(freq)

  if (cpuProfilingTimer) {
    log('Pyroscope has already started cpu profiling')
    return
  }

  cpuProfilingTimer = setInterval(() => {
    log('Continously collecting cpu profile')
    const profile = fixNanosecondsPeriod(cpuProfiler.profile())
    if (profile) {
      log('Continuous cpu profile collected. Going to upload')
      emitter.emit('profile', profile)
      uploadProfile(profile).then(() => log('CPU profile uploaded...'))
    } else {
      log('Cpu profile collection failed')
    }
  }, Number(SAMPLING_DURATION_MS))
}

export function stopCpuCollecting() {
  cpuProfiler.stop()
}

export function stopCpuProfiling(): void {
  if (cpuProfilingTimer !== undefined) {
    clearInterval(cpuProfilingTimer)
    // stop profiler after processing everything the profiler posted
    setImmediate(() => {
      log('Stopping cpu profiling')
      cpuProfilingTimer = undefined
      const profile = fixNanosecondsPeriod(cpuProfiler.profile())
      if (profile) {
        emitter.emit('profile', profile)
        uploadProfile(profile).then(() => log('CPU profile uploaded...'))
      }
      stopCpuCollecting()
    })
  }
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

export function fixNanosecondsPeriod(
  profile?: perftools.profiles.IProfile
): perftools.profiles.IProfile {
  return { ...profile, period: 10000000 }
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
        const newProfile = fixNanosecondsPeriod(processProfile(profile))
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
