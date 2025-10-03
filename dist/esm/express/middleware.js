import debug from 'debug';
import { getProfiler } from '../utils/pyroscope-profiler.js';
import { encode } from '@datadog/pprof';
const log = debug('pyroscope');
async function collectProfile(profiler) {
    const profile = profiler.profile().profile;
    profiler.stop();
    return encode(profile);
}
async function collectProfileAfterMs(profiler, args, delayMs) {
    profiler.start(args);
    if (delayMs === 0) {
        return collectProfile(profiler);
    }
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(collectProfile(profiler));
        }, delayMs);
    });
}
function collectHeap() {
    const profiler = getProfiler();
    const heapProfilerArgs = profiler.heapProfiler.startArgs;
    const heapProfiler = profiler.heapProfiler.profiler;
    return collectProfileAfterMs(heapProfiler, heapProfilerArgs, 0);
}
function collectWall(ms) {
    const profiler = getProfiler();
    const wallProfilerArgs = profiler.wallProfiler.startArgs;
    const wallProfiler = profiler.wallProfiler.profiler;
    return collectProfileAfterMs(wallProfiler, wallProfilerArgs, ms);
}
function profileExpressHandler(profileKind, useCaseHandler) {
    return async (req, res
    // next: NextFunction
    ) => {
        log(`Fetching ${profileKind} Profile`);
        try {
            const profileBuffer = await useCaseHandler(req);
            res.status(200).send(profileBuffer);
        }
        catch (error) {
            log(`Error collecting ${profileKind}`, error);
            res.sendStatus(500);
        }
    };
}
const heapHandler = profileExpressHandler('Heap', () => collectHeap());
const wallHandler = profileExpressHandler('Wall', (req) => collectWall(1000 * Number(req.query.seconds)));
export default function expressMiddleware() {
    return (req, res, next) => {
        if (req.method === 'GET') {
            if (req.path === '/debug/pprof/heap') {
                return heapHandler(req, res, next);
            }
            if (req.path === '/debug/pprof/profile') {
                return wallHandler(req, res, next);
            }
        }
        next();
    };
}
