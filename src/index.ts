import * as pprof from 'pprof'

import perftools from 'pprof/proto/profile'
import debug from 'debug'
import axios, { AxiosError } from 'axios'
import FormData from 'form-data'

type Label = perftools.perftools.profiles.Label
type TagList = Record<string, any>

const log = debug('pyroscope')

export interface PyroscopeConfig {
  server: string
  name: string
  sourceMapPath?: string[]
  autoStart: boolean
}

const INTERVAL = 10000
const SAMPLERATE = 1000
// Base sampling interval, constant for pyroscope
const DEFAULT_SERVER = 'http://localhost:4040'
const DEFAULT_SOURCEMAP_PATH = [process.cwd()]

const config: PyroscopeConfig = {
  server: DEFAULT_SERVER,
  autoStart: true,
  name: 'nodejs',
}

export function init(
  c: PyroscopeConfig = {
    server: DEFAULT_SERVER,
    autoStart: true,
    name: 'nodejs',
  }
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

function handleError(error: AxiosError) {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    log('Pyroscope received error while ingesting data to server')
    log(error.response.data)
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    log('Error when ingesting data to server:', error.message)
  } else {
    // Something happened in setting up the request that triggered an Error
    log('Error', error.message)
  }
}

async function uploadProfile(
  profile: perftools.perftools.profiles.IProfile,
  tags: Label[]
) {
  // Apply labels to all samples
  profile.sample?.forEach((t) => (t.label = tags))
  const buf = await pprof.encode(profile)

  const formData = new FormData()
  formData.append('profile', buf, {
    knownLength: buf.byteLength,
    contentType: 'text/json',
    filename: 'profile',
  })

  // send data to the server
  return axios(
    `${config.server}/ingest?name=${config.name}&sampleRate=${SAMPLERATE}`,
    {
      method: 'POST',
      headers: formData.getHeaders(),
      data: formData as any,
    }
  ).catch(handleError)
}

let isCpuProfilingEnabled = true

const tagListToLabels = (tags: TagList) =>
  Object.keys(tags).map((t: string) =>
    perftools.perftools.profiles.Label.create({
      key: t as any,
      str: tags[t],
    })
  )

export async function startCpuProfiling(tags: TagList = {}) {
  isCpuProfilingEnabled = true
  log('Pyroscope has started CPU Profiling')
  const sourceMapPath = config.sourceMapPath || [process.cwd()]
  const sm = await pprof.SourceMapper.create(sourceMapPath)
  while (isCpuProfilingEnabled) {
    log('Collecting CPU Profile')
    const profile = await pprof.time.profile({
      lineNumbers: true,
      sourceMapper: sm,
      durationMillis: INTERVAL,
    })
    console.log(profile)
    log('CPU Profile uploaded')
    await uploadProfile(profile, tagListToLabels(tags))
    log('CPU Profile has been uploaded')
  }
}

export async function stopCpuProfiling() {
  isCpuProfilingEnabled = false
}

// Could be false or a function to stop heap profiling
let heapProfilingTimer: undefined | NodeJS.Timer = undefined

export async function startHeapProfiling(tags: TagList = {}) {
  const intervalBytes = 1024 * 512
  const stackDepth = 32

  if (heapProfilingTimer) return false
  log('Pyroscope has started heap profiling')

  const sm = await pprof.SourceMapper.create([process.cwd()])

  pprof.heap.start(intervalBytes, stackDepth)

  heapProfilingTimer = setInterval(async () => {
    log('Collecting heap profile')
    const profile = pprof.heap.profile(undefined, sm)
    log('Heap profile collected...')
    await uploadProfile(profile, tagListToLabels(tags))
    log('Heap profile uploaded...')
  }, INTERVAL)
}

export function stopHeapProfiling() {
  if (heapProfilingTimer) {
    log('Stopping heap profiling')
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
