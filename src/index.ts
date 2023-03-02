import * as pprof from '@datadog/pprof'

import * as pprofFormat from 'pprof-format'

import debug from 'debug'
import axios, { AxiosError } from 'axios'
import FormData from 'form-data'
import 'regenerator-runtime/runtime'

import { EventEmitter } from 'events'

type TagList = Record<string, any>

export const log = debug('pyroscope')

export const emitter = new EventEmitter()

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

// The Interval in which samples should be collected.
export const SAMPLING_INTERVAL_MS =
  process.env['PYROSCOPE_SAMPLING_INTERVAL'] || 10 // in milliseconds // e.g. 10ms will be equivalent to a frequency of 100Hz

// The Duration for which a sample should be collected.
export const SAMPLING_DURATION_MS =
  process.env['PYROSCOPE_SAMPLING_DURATION'] || 10000 // in milliseconds

export const HEAP_INTERVAL_BYTES = Number(
  process.env['PYROSCOPE_HEAP_INTERVAL'] || 1024 * 512
)
export const HEAP_STACK_DEPTH = Number(
  process.env['PYROSCOPE_HEAP_STACK_DEPTH'] || 64
)

export const config: PyroscopeConfig = {
  serverAddress: process.env['PYROSCOPE_SERVER_ADDRESS'],
  appName: process.env['PYROSCOPE_APPLICATION_NAME'] || '',
  sm: undefined,
  tags: {},
  authToken: process.env['PYROSCOPE_AUTH_TOKEN'],
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

export const processProfile = (p: pprofFormat.Profile): pprofFormat.Profile => {
  const replacements = {
    objects: 'inuse_objects',
    space: 'inuse_space',
    sample: 'samples',
  } as Record<string, string>
  // Replace the names of the samples to meet golang naming
  p.sampleType.forEach((st) => {
    for (const replacementsKey in replacements) {
      const replacementVal = replacements[replacementsKey]
      const unit = p.stringTable.strings[st.unit as number]
      if (unit === replacementsKey) {
        st.unit = p.stringTable.dedup(replacementVal)
      }
      const type = p.stringTable.strings[st.type as number]
      if (type === replacementsKey) {
        st.type = p.stringTable.dedup(replacementVal)
      }
    }
  })
  p.location.forEach((loc) => {
    loc.line.forEach((line) => {
      const functionID = line.functionId
      const functionCtx: pprofFormat.Function | undefined = p.function.find(
        (x) => x.id == functionID
      )
      if (!functionCtx) {
        return
      }
      const functionName = p.stringTable.strings[Number(functionCtx.name)]
      if (functionName.indexOf(':') === -1) {
        const fileName = p.stringTable.strings[Number(functionCtx.filename)]
        const newName = `${fileName}:${functionName}:${line.line}` as string
        functionCtx.name = p.stringTable.dedup(newName)
      }
    })
  })

  return p
}

export async function uploadProfile(
  profile: pprofFormat.Profile,
  sampleTypeConfig?: string
) {
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
    if (sampleTypeConfig) {
      formData.append('sample_type_config', sampleTypeConfig, {
        knownLength: sampleTypeConfig.length,
        filename: 'sample_type_config.json',
      })
    }

    const tagList = config.tags
      ? Object.keys(config.tags).map(
          (t: string) =>
            `${encodeURIComponent(t)}=${encodeURIComponent(config.tags[t])}`
        )
      : ''

    const url = `${config.serverAddress}/ingest?name=${encodeURIComponent(
      config.appName
    )}{${tagList}}&sampleRate=${
      1000 / Number(SAMPLING_INTERVAL_MS)
    }&spyName=nodespy` // 1000, because our sample rate is in milliseconds
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

export function checkConfigured() {
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

export function start(): void {
  startCpuProfiling()
  startHeapProfiling()
}

export function stop(): Promise<void> {
  return Promise.all([stopCpuProfiling(), stopHeapProfiling()]).then(
    () => undefined
  )
}
// CPU Export
import {
  startCpuProfiling,
  stopCpuProfiling,
  setCpuLabels,
  getCpuLabels,
  tagWrapper,
  collectCpu,
} from './cpu.js'
export {
  startCpuProfiling,
  stopCpuProfiling,
  setCpuLabels,
  getCpuLabels,
  collectCpu,
  tagWrapper,
}
// Heap Export
import {
  startHeapProfiling,
  stopHeapProfiling,
  collectHeap,
  startHeapCollecting,
  stopHeapCollecting,
} from './heap.js'
export {
  startHeapProfiling,
  stopHeapProfiling,
  collectHeap,
  startHeapCollecting,
  stopHeapCollecting,
}
// Wall Export
import { startWallProfiling, stopWallProfiling, collectWall } from './wall.js'
export { startWallProfiling, stopWallProfiling, collectWall }

import expressMiddleware from './express.js'
export { expressMiddleware }

export default {
  init,
  startCpuProfiling,
  stopCpuProfiling,
  startWallProfiling,
  stopWallProfiling,
  startHeapProfiling,
  stopHeapProfiling,
  collectCpu,
  collectWall,
  collectHeap,
  startHeapCollecting,
  stopHeapCollecting,
  start,
  stop,

  emitter,
  tagWrapper,

  expressMiddleware,
}
