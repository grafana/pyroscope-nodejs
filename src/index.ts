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
import { SourceMapper, setLogger } from '@datadog/pprof'

export function init(config: PyroscopeConfig = {}): void {
  checkPyroscopeConfig(config)

  const processedConfig: PyroscopeConfig = processConfig(config, getEnv())

  setProfiler(new PyroscopeProfiler(processedConfig))
}

// deprecated: please use getLabels
function getWallLabels(): Record<string, number | string> {
  return getLabels()
}

// deprecated: please use setLabels
function setWallLabels(labels: Record<string, number | string>): void {
  return setLabels(labels)
}

function getLabels(): Record<string, number | string> {
  return getProfiler().wallProfiler.profiler.getLabels()
}

function setLabels(labels: Record<string, number | string>): void {
  getProfiler().wallProfiler.profiler.setLabels(labels)
}

export function wrapWithLabels(
  lbls: Record<string, string | number>,
  fn: () => void,
  ...args: unknown[]
): void {
  getProfiler().wallProfiler.profiler.wrapWithLabels(lbls, fn, ...args)
}

function startWallProfiling(): void {
  getProfiler().wallProfiler.start()
}

// here for backwards compatibility
function startCpuProfiling(): void {
  getProfiler().wallProfiler.start()
}

async function stopWallProfiling(): Promise<void> {
  await getProfiler().wallProfiler.stop()
}

// here for backwards compatibility
async function stopCpuProfiling(): Promise<void> {
  await getProfiler().wallProfiler.stop()
}

function startHeapProfiling(): void {
  getProfiler().heapProfiler.start()
}

async function stopHeapProfiling(): Promise<void> {
  await getProfiler().heapProfiler.stop()
}

export function start(): void {
  startWallProfiling()
  startHeapProfiling()
}

export async function stop(): Promise<void> {
  await Promise.all([stopWallProfiling(), stopHeapProfiling()])
}

export { PyroscopeConfig, PyroscopeHeapConfig, PyroscopeWallConfig }

export default {
  SourceMapper,
  expressMiddleware,
  init,
  getWallLabels,
  setWallLabels,
  getLabels,
  setLabels,
  wrapWithLabels,
  start,
  startHeapProfiling,
  startWallProfiling,
  startCpuProfiling,
  stop,
  stopHeapProfiling,
  stopWallProfiling,
  stopCpuProfiling,
  setLogger,
}
