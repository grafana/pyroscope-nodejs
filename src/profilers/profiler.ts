import { ProfileExport } from '../profile-exporter.js';

export interface Profiler<TStartArgs> {
  getLabels(): Record<string, number | string>;

  setLabels(labels: Record<string, number | string>): void;

  wrapWithLabels<R, TArgs extends unknown[]>(
    labels: Record<string, number | string>,
    fn: (...args: TArgs) => R,
    ...args: TArgs
  ): R;

  start(args: TStartArgs): void;

  stop(): ProfileExport | null;

  profile(): ProfileExport;
}
