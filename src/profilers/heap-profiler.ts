import { heap } from '@datadog/pprof'
import { Profile } from 'pprof-format'

import { ProfileExport } from '../profile-exporter'
import { Profiler } from './profiler'
import debug from 'debug'

const log = debug('pyroscope::profiler::heap')

export interface HeapProfilerStartArgs {
  samplingIntervalBytes: number
  stackDepth: number
}

export class HeapProfiler implements Profiler<HeapProfilerStartArgs> {
  private labels: Record<string, number | string>
  private lastProfiledAt: Date

  constructor() {
    this.labels = {}
    this.lastProfiledAt = new Date()
  }

  public getLabels(): Record<string, number | string> {
    return this.labels
  }

  public profile(): ProfileExport {
    log('profile')

    const profile: Profile = heap.profile()

    const lastProfileStartedAt: Date = this.lastProfiledAt
    this.lastProfiledAt = new Date()

    return {
      profile,
      startedAt: lastProfileStartedAt,
      stoppedAt: this.lastProfiledAt,
    }
  }

  public setLabels(labels: Record<string, number | string>): void {
    this.labels = labels
  }

  public start(args: HeapProfilerStartArgs): void {
    log('start')

    this.lastProfiledAt = new Date()
    heap.start(args.samplingIntervalBytes, args.stackDepth)
  }

  public stop(): null {
    log('stop')

    heap.stop()

    return null
  }
}
