import pprof from 'pprof'

import perftools from 'pprof/proto/profile'

import fetch from 'node-fetch'
import FormData from 'form-data'

type Label = perftools.perftools.profiles.Label

export interface PyroscopeConfig {
  server: string
  sourceMapPath?: string[]
  autoStart: boolean
}

const INTERVAL = 10000
// Base sampling interval, constant for pyroscope
const DEFAULT_SERVER = 'http://localhost:4040'
const DEFAULT_SOURCEMAP_PATH = [process.cwd()]

const config: PyroscopeConfig = {
  server: DEFAULT_SERVER,
  autoStart: true,
}

export function init(
  c: PyroscopeConfig = { server: DEFAULT_SERVER, autoStart: true }
): void {
  if (c) {
    config.server = c.server || DEFAULT_SERVER
    config.sourceMapPath = c.sourceMapPath || DEFAULT_SOURCEMAP_PATH
  }

  if (c && c.autoStart) {
    startCpuProfiling()
    startHeapProfiling()
  }
}

async function uploadProfile(profile: perftools.perftools.profiles.IProfile) {
  // TODO: Tag profile here

  const buf = await pprof.encode(profile)

  const formData = new FormData()
  formData.append('profile', buf, {
    knownLength: buf.byteLength,
    contentType: 'text/json',
    filename: 'profile',
  })

  // send data to the server
  return fetch(
    `${config.server}/ingest?name=nodejs&sampleRate=100&spyName=nodejs`,
    {
      method: 'POST',
      headers: formData.getHeaders(),
      body: formData,
    }
  )
}

let isCpuProfilingEnabled = true

export async function startCpuProfiling() {
  isCpuProfilingEnabled = true
  const sourceMapPath = config.sourceMapPath || [process.cwd()]
  const sm = await pprof.SourceMapper.create(sourceMapPath)
  while (isCpuProfilingEnabled) {
    const profile = await pprof.time.profile({
      lineNumbers: true,
      sourceMapper: sm,
      durationMillis: INTERVAL,
    })
    await uploadProfile(profile)
  }
}

export async function stopCpuProfiling() {
  isCpuProfilingEnabled = false
}

// Could be false or a function to stop heap profiling
let heapProfilingTimer: undefined | NodeJS.Timer = undefined

export async function startHeapProfiling() {
  const intervalBytes = 1024 * 512
  const stackDepth = 32

  if (heapProfilingTimer) return false

  const sm = await pprof.SourceMapper.create([process.cwd()])

  pprof.heap.start(intervalBytes, stackDepth)

  heapProfilingTimer = setInterval(async () => {
    console.log('Collecting heap profile')
    const profile = pprof.heap.profile(undefined, sm)
    console.log('Heap profile collected...')
    await uploadProfile(profile)
    console.log('Heap profile uploaded...')
  }, INTERVAL)
}

export function stopHeapProfiling() {
  if (heapProfilingTimer) {
    console.log('Stopping heap profiling')
    clearInterval(heapProfilingTimer)
    heapProfilingTimer = undefined
  }
}

export default {
  init,
  startCpuProfiling,
  stopCpuProfiling,
  startHeapProfiling,
  stopHeapProfiling,
}
