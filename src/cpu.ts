/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { CpuProfiler, encode } from '@datadog/pprof'
import { Profile } from 'pprof-format'
import debug from 'debug'
import {
  checkConfigured,
  config,
  emitter,
  processProfile,
  SAMPLING_DURATION_MS,
  SAMPLING_INTERVAL_MS,
  uploadProfile,
} from './index'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ShamefulAny = any

const log = debug('pyroscope::cpu')

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
    const profile = cpuProfiler.profile()
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

export function stopCpuProfiling(): Promise<void> {
  log(`stopping cpuProfiling`)
  return new Promise<void>(async (resolve, reject) => {
    if (cpuProfilingTimer !== undefined) {
      clearInterval(cpuProfilingTimer)
      try {
        // stop profiler asynchronously after processing everything the profiler posted
        // https://github.com/DataDog/pprof-nodejs/blob/v2.0.0/bindings/profilers/cpu.cc#L96
        const profile = await new Promise<Profile>((resolve, reject) => {
          setImmediate(() => {
            const profile = cpuProfiler.profile()
            if (profile) {
              emitter.emit('profile', profile)
              resolve(profile)
            } else {
              reject()
            }
          })
        })
        log(`uploading cpu profile`)
        await uploadProfile(profile)
        log(`uploaded cpu profile`)
      } catch (e) {
        log(`failed to capture last profile during stop: ${e}`)
      }
      cpuProfilingTimer = undefined
      stopCpuCollecting()
      resolve()
    } else {
      reject()
    }
  })
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
