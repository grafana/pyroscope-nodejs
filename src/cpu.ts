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
  INTERVAL,
  processProfile,
  SAMPLERATE,
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
  cpuProfiler.start(SAMPLERATE)

  if (cpuProfilingTimer) {
    log('Pyroscope has already started cpu profiling')
    return
  }

  cpuProfilingTimer = setInterval(() => {
    log('Continously collecting cpu profile')
    const profile = fixNanosecondsPeriod(cpuProfiler.profile())
    if (profile) {
      log('Continuous cpu profile collected. Going to upload')
      uploadProfile(profile).then(() => log('CPU profile uploaded...'))
    } else {
      log('Cpu profile collection failed')
    }
  }, INTERVAL)
}

export function stopCpuCollecting() {
  cpuProfiler.stop()
}

export function stopCpuProfiling(): void {
  if (cpuProfilingTimer) {
    log('Stopping heap profiling')
    clearInterval(cpuProfilingTimer)
    cpuProfilingTimer = undefined
    stopCpuCollecting()
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
  cpuProfiler.start(100)

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      log('Collecting cpu profile')
      const profile = cpuProfiler.profile()
      if (profile) {
        log('Cpu profile collected. Now processing')
        const newProfile = fixNanosecondsPeriod(processProfile(profile))
        if (newProfile) {
          log('Processed profile. Now encoding to pprof format')
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
    cpuProfiler.labels[key] = undefined
  })
}
