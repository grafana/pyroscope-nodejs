import { Profile } from 'pprof-format'
import { emitter, uploadProfile } from './index'
import debug from 'debug'

export interface ProfilerImpl {
  start(): void

  stop(): void

  profile(): Profile | undefined
}

export interface Exporter {
  export(p: Profile): Promise<void>
}

export class PyroscopeApiExporter implements Exporter {
  sampleTypeConfig?: string

  constructor(sampleTypeConfig?: string) {
    this.sampleTypeConfig = sampleTypeConfig
  }

  export(p: Profile): Promise<void> {
    return uploadProfile(p, this.sampleTypeConfig).then(() => undefined)
  }
}

export interface ContinuousProfilerInput {
  profiler: ProfilerImpl
  exporter: Exporter
  name: string
  duration: number
}

export class ContinuousProfiler {
  private readonly profiler: ProfilerImpl
  private readonly exporter: Exporter
  private readonly log: debug.Debugger
  private readonly duration: number
  private timer: NodeJS.Timeout | undefined
  private lastExport: Promise<void> | undefined

  constructor(input: ContinuousProfilerInput) {
    this.profiler = input.profiler
    this.exporter = input.exporter
    this.duration = input.duration
    this.log = debug(`pyroscope::continuous_${input.name}`)
  }

  start(): void {
    if (this.timer !== undefined) {
      this.log('already started')
      return
    }
    this.log('start')
    this.profiler.start()
    this.scheduleProfilingRound()
  }

  stop(): Promise<void> {
    if (this.timer === undefined) {
      this.log('already stopped')
      return Promise.resolve(undefined)
    }
    this.log('stopping')
    clearTimeout(this.timer)
    this.timer = undefined
    return new Promise<void>(async (resolve) => {
      if (this.lastExport !== undefined) {
        await this.lastExport
      }
      try {
        const profile = await this.captureAsync()
        this.log('profile exporting')
        await this.exporter.export(profile)
      } catch (e) {
        this.log(`failed to capture last profile during stop: ${e}`)
      }
      this.log('stopping profiler')
      this.profiler.stop()
      this.log('stopped profiler')
      resolve()
      this.log('done')
    })
  }

  private scheduleProfilingRound() {
    this.timer = setTimeout(() => {
      setImmediate(() => {
        try {
          this.profilingRound()
          this.scheduleProfilingRound()
        } catch (e) {
          this.log(`profile collection failed ${e}`)
        }
      })
    }, this.duration)
  }

  private profilingRound() {
    this.log('profile capturing')
    const profile = this.profiler.profile()
    if (profile) {
      this.log('profile exporting')
      emitter.emit('profile', profile)
      // todo(korniltsev) create a buffer/queue of configurable size instead of single inflight export
      if (this.lastExport === undefined) {
        this.lastExport = this.exporter
          .export(profile)
          .catch()
          .then(() => {
            this.lastExport = undefined
          })
      } else {
        this.log('dropping profile')
      }
    } else {
      this.log('profile capturing failed')
    }
  }

  private captureAsync(): Promise<Profile> {
    this.log('profile capturing async')
    // stop profiler asynchronously after processing everything the profiler posted
    // https://github.com/DataDog/pprof-nodejs/blob/v2.0.0/bindings/profilers/cpu.cc#L96
    return new Promise<Profile>((resolve, reject) => {
      setImmediate(() => {
        const profile = this.profiler.profile()
        if (profile) {
          this.log('profile captured')
          emitter.emit('profile', profile)
          resolve(profile)
        } else {
          this.log('profile capturing failed')
          reject()
        }
      })
    })
  }
}
