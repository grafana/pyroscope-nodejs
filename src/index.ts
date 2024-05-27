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
import { setLogger as datadogSetLogger } from '@datadog/pprof'
import { setLogger as ourSetLogger, Logger } from './logger'
import { SourceMapper } from './sourcemapper'

export function init(config: PyroscopeConfig = {}): void {
  checkPyroscopeConfig(config)

  const processedConfig: PyroscopeConfig = processConfig(config, getEnv())

  setProfiler(new PyroscopeProfiler(processedConfig))
}

function getWallLabels(): Record<string, number | string> {
  return getProfiler().wallProfiler.profiler.getLabels()
}

function setWallLabels(labels: Record<string, number | string>): void {
  getProfiler().wallProfiler.profiler.setLabels(labels)
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

function setLogger(logger: Logger): void {
  datadogSetLogger(logger)
  ourSetLogger(logger)
}

export default {
  SourceMapper,
  expressMiddleware,
  getWallLabels,
  init,
  setWallLabels,
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
