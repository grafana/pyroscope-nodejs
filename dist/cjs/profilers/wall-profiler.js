"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WallProfiler = void 0;
const pprof_1 = require("@datadog/pprof");
const debug_1 = __importDefault(require("debug"));
const MICROS_PER_SECOND = 1e6;
const log = (0, debug_1.default)('pyroscope::profiler::wall');
class WallProfiler {
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
        if (!pprof_1.time.isStarted()) {
            log('start');
            this.lastProfiledAt = new Date();
            this.lastSamplingIntervalMicros = args.samplingDurationMs;
            pprof_1.time.start({
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
        pprof_1.time.setContext(o);
    }
    generateLabels(args) {
        const context = args.context?.context;
        return { ...(context?.labels ?? {}) };
    }
    innerProfile(restart) {
        this.newContext({});
        const profile = pprof_1.time.stop(restart, this.generateLabels);
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
exports.WallProfiler = WallProfiler;
