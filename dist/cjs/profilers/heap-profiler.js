"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeapProfiler = void 0;
const pprof_1 = require("@datadog/pprof");
const debug_1 = __importDefault(require("debug"));
const log = (0, debug_1.default)('pyroscope::profiler::heap');
class HeapProfiler {
    lastProfiledAt;
    sourceMapper;
    constructor() {
        this.lastProfiledAt = new Date();
    }
    getLabels() {
        throw new Error("heap profiler doesn't support labels");
    }
    wrapWithLabels() {
        throw new Error("heap profiler doesn't support labels");
    }
    profile() {
        log('profile');
        const profile = pprof_1.heap.profile(undefined, this.sourceMapper, undefined);
        const lastProfileStartedAt = this.lastProfiledAt;
        this.lastProfiledAt = new Date();
        return {
            profile,
            startedAt: lastProfileStartedAt,
            stoppedAt: this.lastProfiledAt,
        };
    }
    setLabels() {
        throw new Error("heap profiler doesn't support labels");
    }
    start(args) {
        log('start');
        this.lastProfiledAt = new Date();
        this.sourceMapper = args.sourceMapper;
        pprof_1.heap.start(args.samplingIntervalBytes, args.stackDepth);
    }
    stop() {
        log('stop');
        pprof_1.heap.stop();
        return null;
    }
}
exports.HeapProfiler = HeapProfiler;
