"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug"));
const pyroscope_profiler_js_1 = require("../utils/pyroscope-profiler.js");
const pprof_1 = require("@datadog/pprof");
const log = (0, debug_1.default)('pyroscope');
async function collectProfile(profiler) {
    const profile = profiler.profile().profile;
    profiler.stop();
    return (0, pprof_1.encode)(profile);
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
    const profiler = (0, pyroscope_profiler_js_1.getProfiler)();
    const heapProfilerArgs = profiler.heapProfiler.startArgs;
    const heapProfiler = profiler.heapProfiler.profiler;
    return collectProfileAfterMs(heapProfiler, heapProfilerArgs, 0);
}
function collectWall(ms) {
    const profiler = (0, pyroscope_profiler_js_1.getProfiler)();
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
function expressMiddleware() {
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
exports.default = expressMiddleware;
