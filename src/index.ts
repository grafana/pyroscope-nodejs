import * as pprof from 'pprof'

import type perftools from 'pprof/proto/profile'
import debug from 'debug'
import axios, { AxiosBasicCredentials, AxiosError } from 'axios'
import FormData from 'form-data'
import 'regenerator-runtime/runtime.js'

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
  basicAuthUser?: string
  basicAuthPassword?: string
  tenantID?: string
  configured: boolean
}

// The Interval in which samples should be collected.
const SAMPLING_INTERVAL_MS =  process.env['PYROSCOPE_SAMPLING_INTERVAL'] || 10 // in milliseconds // e.g. 10ms will be equivalent to a frequency of 100Hz


// The Duration for which a sample should be collected.
const SAMPLING_DURATION_MS =  process.env['PYROSCOPE_SAMPLING_DURATION'] || 10000 // in milliseconds


const config: PyroscopeConfig = {
  serverAddress: process.env['PYROSCOPE_SERVER_ADDRESS'],
  appName: process.env['PYROSCOPE_APPLICATION_NAME'] || '',
  sm: undefined,
  tags: {},
  authToken: process.env['PYROSCOPE_AUTH_TOKEN'],
  basicAuthUser: process.env['PYROSCOPE_BASIC_AUTH_USER'],
  basicAuthPassword: process.env['PYROSCOPE_BASIC_AUTH_PASSWORD'],
  tenantID: process.env['PYROSCOPE_TENANT_ID'],
  configured: false,
}

export function init(c: Partial<PyroscopeConfig> = {}): void {
  config.serverAddress = c.serverAddress || config.serverAddress
  const adhocAddress = process.env['PYROSCOPE_ADHOC_SERVER_ADDRESS'] || ''
  if (adhocAddress.length > 0) {
    log(`Overwriting serverAddress with ${adhocAddress}`)
    config.serverAddress = adhocAddress
  }

  config.appName = c.appName || config.appName
  config.sourceMapPath = c.sourceMapPath || config.sourceMapPath
  config.authToken = c.authToken || config.authToken
  config.basicAuthUser = c.basicAuthUser || config.basicAuthUser
  config.basicAuthPassword = c.basicAuthPassword || config.basicAuthPassword
  config.tenantID = c.tenantID || config.tenantID
  config.tags = c.tags || config.tags

  if (!!config.sourceMapPath) {
    pprof.SourceMapper.create(config.sourceMapPath)
      .then((sm) => (config.sm = sm))
      .catch((e) => {
        log(e)
      })
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

    let serverAddress = config.serverAddress
    if (serverAddress?.endsWith('/')) {
      serverAddress = serverAddress.slice(0, -1)
    }
    const url = `${serverAddress}/ingest?name=${encodeURIComponent(
      config.appName
    )}{${tagList}}&sampleRate=${1000/Number(SAMPLING_INTERVAL_MS)}&spyName=nodespy` // 1000, because our sample rate is in milliseconds
    log(`Sending data to ${url}`)
    // send data to the server
    const headers = formData.getHeaders()
    if (config.authToken) {
      headers['Authorization'] = `Bearer ${config.authToken}`
    }
    if (config.tenantID) {
      headers['X-Scope-OrgID'] = config.tenantID
    }
    const auth: AxiosBasicCredentials | undefined =
      config.basicAuthUser && config.basicAuthPassword
        ? {
            username: config.basicAuthUser,
            password: config.basicAuthPassword,
          }
        : undefined
    return axios(url, {
      method: 'POST',
      headers: headers,
      data: formData as any,
      auth: auth,
    }).catch(handleError)
  }
}

// Could be false or a function to stop heap profiling
let heapProfilingTimer: NodeJS.Timeout | undefined = undefined
let isWallProfilingRunning = false

export async function collectCpu(seconds?: number): Promise<Buffer> {
  if (!config.configured) {
    throw 'Pyroscope is not configured. Please call init() first.'
  }

  try {
    const profile = await pprof.time.profile({
      lineNumbers: true,
      sourceMapper: config.sm,
      durationMillis: (seconds || 10) * 1000 || Number(SAMPLING_DURATION_MS), // https://github.com/google/pprof-nodejs/blob/0eabf2d9a4e13456e642c41786fcb880a9119f28/ts/src/time-profiler.ts#L35-L36
      intervalMicros: Number(SAMPLING_INTERVAL_MS)*1000, // https://github.com/google/pprof-nodejs/blob/0eabf2d9a4e13456e642c41786fcb880a9119f28/ts/src/time-profiler.ts#L37-L38
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

function checkConfigured() {
  if (!config.configured) {
    throw 'Pyroscope is not configured. Please call init() first.'
  }

  if (!config.serverAddress) {
    throw 'Please set the server address in the init()'
  }

  if (!config.appName) {
    throw 'Please define app name in the init()'
  }
}

export function startWallProfiling(): void {
  checkConfigured()

  log('Pyroscope has started CPU Profiling')
  isWallProfilingRunning = true

  const profilingRound = () => {
    log('Collecting CPU Profile')
    pprof.time
      .profile({
        lineNumbers: true,
        sourceMapper: config.sm,
        durationMillis: Number(SAMPLING_DURATION_MS),
        intervalMicros: Number(SAMPLING_INTERVAL_MS)*1000,
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
  checkConfigured()

  if (heapProfilingTimer) {
    log('Pyroscope has already started heap profiling')
    return
  }

  startHeapCollecting()

  heapProfilingTimer = setInterval(() => {
    log('Collecting heap profile')
    const profile = pprof.heap.profile(undefined, config.sm)
    log('Heap profile collected...')
    uploadProfile(profile).then(() => log('Heap profile uploaded...'))
  }, Number(SAMPLING_DURATION_MS))
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
