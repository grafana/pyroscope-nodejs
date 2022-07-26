/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { CpuProfiler, encode } from '@datadog/pprof'
import { perftools } from '@datadog/pprof/proto/profile'
import debug from 'debug'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShamefulAny = any

const log = debug('pyroscope::cpu')

import { checkConfigured, config, processProfile, uploadProfile } from './index'

const cpuProfiler = new CpuProfiler()

let cpuProfilingTimer: NodeJS.Timer | undefined = undefined

export function startCpuProfiling() {
  checkConfigured()

  log('Pyroscope has started CPU Profiling')
  cpuProfiler.start(100)

  if (cpuProfilingTimer) {
    log('Pyroscope has already started cpu profiling')
    return
  }

  cpuProfilingTimer = setInterval(() => {
    log('Collecting cpu profile')
    const profile = cpuProfiler.profile()
    if (profile) {
      log('Cpu profile collected')
      uploadProfile(profile).then(() => log('CPU profile uploaded...'))
    } else {
      log('Cpu profile collection failed')
    }
  }, 10000)
}

export function stopCpuCollecting() {
  cpuProfiler.Stop()
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


export function collectCpu(seconds: number): Promise<Buffer> {
  if (!config.configured) {
    throw 'Pyroscope is not configured. Please call init() first.'
  }
  log('Pyroscope has started CPU Profiling')
  return new Promise((resolve, reject) => {
    cpuProfiler.start(100);

    setInterval(() => {
      log('Collecting cpu profile')
      const profile = cpuProfiler.profile();
      if (profile) {
        log('Cpu profile collected')
        const newProfile = processProfile(profile);
        if ( newProfile ) {
          encode(newProfile).then(profile => resolve(profile))
        }
      } else {
        log('Cpu profile collection failed')
      }
    }, seconds * 1000);
  }
}

export function tagWrapper(
  key: string,
  value: string | undefined,
  fn: () => void,
  ...args: unknown[]
) {
  tag(key, value)
  ;(fn as ShamefulAny)(...args)
  tag(key, undefined)
}
