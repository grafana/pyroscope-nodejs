import { time } from '@datadog/pprof';
import debug from 'debug';
const MICROS_PER_SECOND = 1e6;
const log = debug('pyroscope::profiler::wall');
export class WallProfiler {
    lastProfiledAt;
    lastContext;
    lastSamplingIntervalMicros;
    constructor() {
        this.lastContext = {};
        this.lastProfiledAt = new Date();
    }
    getLabels() {
        return this.lastContext.labels ?? {};
    }
    profile() {
        log('profile');
        return this.innerProfile(true);
    }
    wrapWithLabels(lbls, fn, ...args) {
        const oldLabels = this.getLabels();
        this.setLabels({
            ...oldLabels,
            ...lbls,
        });
        fn(...args);
        this.setLabels({
            ...oldLabels,
        });
    }
    setLabels(labels) {
        this.newContext({
            labels: labels,
        });
    }
    start(args) {
        if (!time.isStarted()) {
            log('start');
            this.lastProfiledAt = new Date();
            this.lastSamplingIntervalMicros = args.samplingDurationMs;
            time.start({
                sourceMapper: args.sourceMapper,
                durationMillis: args.samplingDurationMs,
                intervalMicros: args.samplingIntervalMicros,
                withContexts: true,
                workaroundV8Bug: true,
                collectCpuTime: args.collectCpuTime,
            });
            this.newContext({});
        }
    }
    stop() {
        log('stop');
        return this.innerProfile(false);
    }
    newContext(o) {
        this.lastContext = o;
        time.setContext(o);
    }
    generateLabels(args) {
        const context = args.context?.context;
        return { ...(context?.labels ?? {}) };
    }
    innerProfile(restart) {
        this.newContext({});
        const profile = time.stop(restart, this.generateLabels);
        const lastProfileStartedAt = this.lastProfiledAt;
        this.lastProfiledAt = new Date();
        return {
            profile,
            sampleRate: Math.ceil(MICROS_PER_SECOND / this.lastSamplingIntervalMicros),
            startedAt: lastProfileStartedAt,
            stoppedAt: this.lastProfiledAt,
        };
    }
}
