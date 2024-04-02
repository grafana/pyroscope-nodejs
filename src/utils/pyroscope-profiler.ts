import { PyroscopeProfiler } from '../profilers/pyroscope-profiler'

let pyroscopeProfiler: PyroscopeProfiler | undefined

function assertInitialized(
  pyroscopeProfiler: PyroscopeProfiler | undefined
): asserts pyroscopeProfiler is PyroscopeProfiler {
  if (pyroscopeProfiler === undefined) {
    throw new Error('Pyroscope is not configured. Please call init() first.')
  }
}

export function getProfiler(): PyroscopeProfiler {
  assertInitialized(pyroscopeProfiler)

  return pyroscopeProfiler
}

export function setProfiler(value: PyroscopeProfiler): void {
  pyroscopeProfiler = value
}
