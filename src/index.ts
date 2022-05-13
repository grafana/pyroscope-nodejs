import * as pprof from 'pprof'

import type perftools from 'pprof/proto/profile'
import debug from 'debug'
import axios, { AxiosError } from 'axios'
import FormData from 'form-data'

type TagList = Record<string, any>

const log = debug('pyroscope')

const cloudHostnameSuffix = 'pyroscope.cloud'

export interface PyroscopeConfig {
  serverAddress?: string
  appName: string
  sourceMapPath?: string[]
  sm?: any
  tags: TagList
  authToken?: string
  configured: boolean
}

const INTERVAL = 10000
const SAMPLERATE = 100

const config: PyroscopeConfig = {
  serverAddress: process.env['PYROSCOPE_SERVER_ADDRESS'],
  appName: process.env['PYROSCOPE_APPLICATION_NAME'] || '',
  sm: undefined,
  tags: {},
  authToken: process.env['PYROSCOPE_AUTH_TOKEN'],
  configured: false,
}

export function init(c: Partial<PyroscopeConfig> = {}): void {
  config.serverAddress = c.serverAddress || config.serverAddress
  config.appName = c.appName || config.appName
  config.sourceMapPath = c.sourceMapPath || config.sourceMapPath
  config.authToken = c.authToken || config.authToken
  config.tags = c.tags || config.tags

  if (!!config.sourceMapPath) {
    pprof.SourceMapper.create(config.sourceMapPath)
      .then((sm) => (config.sm = sm))
      .catch((e) => {
        log(e)
      })
  }

  if (!config.appName) {
    log(
      'Provide a name for the application. Pyroscope is not configured and will not be able to ingest data.'
    )
    return
  }

  if (
    config.serverAddress &&
    config.serverAddress?.indexOf(cloudHostnameSuffix) !== -1 &&
    !config.authToken
  ) {
    log(
      'Pyroscope is running on a cloud server, but no authToken was provided. Pyroscope will not be able to ingest data.'
    )
    return
  }
  config.configured = true
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

export const processProfile = (
  profile: perftools.perftools.profiles.IProfile
): perftools.perftools.profiles.IProfile | undefined => {
  const replacements = {
    objects: 'inuse_objects',
    space: 'inuse_space',
    sample: 'samples',
  } as Record<string, string>
  // Replace the names of the samples to meet golang naming
  const newStringTable = profile.stringTable
    ?.slice(0, 5)
    .map((s) => (replacements[s] ? replacements[s] : s))
    .concat(profile.stringTable?.slice(5))

  // Inject line numbers and file names into symbols table
  const newProfile = profile.location?.reduce(
    (a, location) => {
      // location -> function -> name
      if (location && location.line && a.stringTable) {
        const functionId = location.line[0]?.functionId
        // Find the function name
        const functionCtx: perftools.perftools.profiles.IFunction | undefined =
          a.function?.find((x) => x.id == functionId)

        // Store the new position of injected function name
        const newNameId = a.stringTable.length
        // Get the function name
        const functionName = a.stringTable[Number(functionCtx?.name)]
        if (functionName.indexOf(':') === -1) {
          // Build a new name by concatenating the file name and line number
          const newName = (
            `${a.stringTable[Number(functionCtx?.filename)]}:${
              a.stringTable[Number(functionCtx?.name)]
            }:${location?.line[0].line}` as string
          ).replace(process.cwd(), '.')
          // Store the new name
          if (functionCtx) {
            functionCtx.name = newNameId
          }
          // Update profile string table with the new name and location
          return {
            ...a,
            location: [...(a.location || [])],
            stringTable: [...(a.stringTable || []), newName],
          }
        } else {
          return a
        }
      }
      return {}
    },
    {
      ...profile,
      stringTable: newStringTable,
    } as perftools.perftools.profiles.IProfile
  )
  return newProfile
}

async function uploadProfile(profile: perftools.perftools.profiles.IProfile) {
  // Apply labels to all samples
  const newProfile = processProfile(profile)

  if (newProfile) {
    const buf = await pprof.encode(newProfile)

    const formData = new FormData()
    formData.append('profile', buf, {
      knownLength: buf.byteLength,
      contentType: 'text/json',
      filename: 'profile',
    })

    const tagList = config.tags
      ? Object.keys(config.tags).map(
          (t: string) =>
            `${encodeURIComponent(t)}=${encodeURIComponent(config.tags[t])}`
        )
      : ''

    const url = `${config.serverAddress}/ingest?name=${encodeURIComponent(
      config.appName
    )}{${tagList}}&sampleRate=${SAMPLERATE}&spyName=nodespy`
    log(`Sending data to ${url}`)
    // send data to the server
    return axios(url, {
      method: 'POST',
      headers: config.authToken
        ? {
            ...formData.getHeaders(),
            Authorization: `Bearer ${config.authToken}`,
          }
        : formData.getHeaders(),
      data: formData as any,
    }).catch(handleError)
  }
}

// Could be false or a function to stop heap profiling
let heapProfilingTimer: undefined | NodeJS.Timer = undefined
let isWallProfilingRunning = false

import fs from 'fs'

let chunk = 0
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const writeProfileAsync = (profile: perftools.perftools.profiles.IProfile) => {
  pprof.encode(profile).then((buf) => {
    fs.writeFile(`${config.appName}-${chunk++}.pb.gz`, buf, (err) => {
      if (err) throw err
      console.log('Chunk written')
    })
  })
}

export async function collectCpu(seconds?: number): Promise<Buffer> {
  if (!config.configured) {
    throw 'Pyroscope is not configured. Please call init() first.'
  }

  try {
    const profile = await pprof.time.profile({
      lineNumbers: true,
      sourceMapper: config.sm,
      durationMillis: (seconds || 10) * 1000 || INTERVAL,
      intervalMicros: 10000,
    })

    const newProfile = processProfile(profile)
    if (newProfile) {
      return pprof.encode(newProfile)
    } else {
      return Buffer.from('', 'utf8')
    }
  } catch (e) {
    log(e)
    return Buffer.from('', 'utf8')
  }
}

export async function collectHeap(): Promise<Buffer> {
  if (!config.configured) {
    throw 'Pyroscope is not configured. Please call init() first.'
  }

  log('Collecting heap...')
  const profile = pprof.heap.profile(undefined, config.sm)
  const newProfile = processProfile(profile)
  if (newProfile) {
    return pprof.encode(newProfile)
  } else {
    return Buffer.from('', 'utf8')
  }
}

export function startWallProfiling(): void {
  if (!config.configured) {
    throw 'Pyroscope is not configured. Please call init() first.'
  }

  if (!config.serverAddress) {
    throw 'Please set the server address in the init()'
  }

  log('Pyroscope has started CPU Profiling')
  isWallProfilingRunning = true

  const profilingRound = () => {
    log('Collecting CPU Profile')
    pprof.time
      .profile({
        lineNumbers: true,
        sourceMapper: config.sm,
        durationMillis: INTERVAL,
        intervalMicros: 10000,
      })
      .then((profile) => {
        log('CPU Profile collected')
        if (isWallProfilingRunning) {
          setImmediate(profilingRound)
        }
        log('CPU Profile uploading')
        return uploadProfile(profile)
      })
      .then((d) => {
        log('CPU Profile has been uploaded')
      })
      .catch((e) => {
        log(e)
      })
  }
  profilingRound()
}

// It doesn't stop it immediately, just wait until it ends
export function stopWallProfiling(): void {
  isWallProfilingRunning = false
}

export function start(): void {
  startCpuProfiling()
  startHeapProfiling()
}

export function stop(): void {
  stopCpuProfiling()
  stopHeapProfiling()
}

let isHeapCollectingStarted = false

export function startHeapCollecting() {
  if (!config.configured) {
    throw 'Pyroscope is not configured. Please call init() first.'
  }

  if (isHeapCollectingStarted) {
    log('Heap collecting is already started')
    return
  }

  const intervalBytes = 1024 * 512
  const stackDepth = 32

  log('Pyroscope has started heap profiling')

  pprof.heap.start(intervalBytes, stackDepth)
  isHeapCollectingStarted = true
}

export function startHeapProfiling(): void {
  if (heapProfilingTimer) {
    log('Pyroscope has already started heap profiling')
    return
  }

  startHeapCollecting()

  heapProfilingTimer = setInterval(async () => {
    log('Collecting heap profile')
    const profile = pprof.heap.profile(undefined, config.sm)
    log('Heap profile collected...')
    await uploadProfile(profile)
    log('Heap profile uploaded...')
  }, INTERVAL)
}

export function stopHeapCollecting() {
  pprof.heap.stop()
  isHeapCollectingStarted = false
}

export function stopHeapProfiling(): void {
  if (heapProfilingTimer) {
    log('Stopping heap profiling')
    clearInterval(heapProfilingTimer)
    heapProfilingTimer = undefined
    stopHeapCollecting()
  }
}

export const startCpuProfiling = startWallProfiling
export const stopCpuProfiling = stopWallProfiling

import expressMiddleware from './express.js'
export { expressMiddleware }

export default {
  init,
  startCpuProfiling: startWallProfiling,
  stopCpuProfiling: stopWallProfiling,
  startWallProfiling,
  stopWallProfiling,
  startHeapProfiling,
  stopHeapProfiling,
  collectCpu,
  collectWall: collectCpu,
  collectHeap,
  startHeapCollecting,
  stopHeapCollecting,
  start,
  stop,

  expressMiddleware,
}
