import { ProfileExport } from '../profile-exporter'

export interface Profiler<TStartArgs> {
  getLabels(): Record<string, number | string>

  setLabels(labels: Record<string, number | string>): void

  start(args: TStartArgs): void

  stop(): ProfileExport | null

  profile(): ProfileExport
}
