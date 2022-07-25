/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { CpuProfiler } from '@datadog/pprof'
import debug from 'debug'

const log = debug('pyroscope::cpu')

import { checkConfigured, uploadProfile } from './index'

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

export function getCpuLabels(): any {
  return cpuProfiler.labels
}

export function tag(key: string, value: number | string | undefined) {
  cpuProfiler.labels = { ...cpuProfiler.labels, [key]: value }
}

export function tagCall(
  key: string,
  value: number | string | undefined,
  fn: () => void,
  ...args: unknown[]
) {
  tag(key, value)
  ;(fn as any)(...args)
  tag(key, undefined)
}
