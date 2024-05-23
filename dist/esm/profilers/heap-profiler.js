import { heap } from '@datadog/pprof';
import debug from 'debug';
const log = debug('pyroscope::profiler::heap');
export class HeapProfiler {
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
        const profile = heap.profile(undefined, this.sourceMapper, undefined);
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
        heap.start(args.samplingIntervalBytes, args.stackDepth);
    }
    stop() {
        log('stop');
        heap.stop();
        return null;
    }
}
