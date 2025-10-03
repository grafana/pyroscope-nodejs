import { ProfileExport } from '../profile-exporter.js';
export interface Profiler<TStartArgs> {
    getLabels(): Record<string, number | string>;
    setLabels(labels: Record<string, number | string>): void;
    wrapWithLabels(labels: Record<string, number | string>, fn: () => void, ...args: unknown[]): void;
    start(args: TStartArgs): void;
    stop(): ProfileExport | null;
    profile(): ProfileExport;
}
