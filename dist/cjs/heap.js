"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopHeapProfiling = exports.stopHeapCollecting = exports.startHeapProfiling = exports.startHeapCollecting = exports.collectHeap = void 0;
const pprof = __importStar(require("@datadog/pprof"));
const index_1 = require("./index");
// Could be false or a function to stop heap profiling
let heapProfilingTimer = undefined;
async function collectHeap() {
    if (!index_1.config.configured) {
        throw 'Pyroscope is not configured. Please call init() first.';
    }
    (0, index_1.log)('Collecting heap...');
    const profile = pprof.heap.profile(undefined, index_1.config.sm);
    const newProfile = (0, index_1.processProfile)(profile);
    if (newProfile) {
        return pprof.encode(newProfile);
    }
    else {
        return Buffer.from('', 'utf8');
    }
}
exports.collectHeap = collectHeap;
let isHeapCollectingStarted = false;
function startHeapCollecting() {
    if (!index_1.config.configured) {
        throw 'Pyroscope is not configured. Please call init() first.';
    }
    if (isHeapCollectingStarted) {
        (0, index_1.log)('Heap collecting is already started');
        return;
    }
    const intervalBytes = 1024 * 512;
    const stackDepth = 32;
    (0, index_1.log)('Pyroscope has started heap profiling');
    pprof.heap.start(intervalBytes, stackDepth);
    isHeapCollectingStarted = true;
}
exports.startHeapCollecting = startHeapCollecting;
function startHeapProfiling() {
    (0, index_1.checkConfigured)();
    if (heapProfilingTimer) {
        (0, index_1.log)('Pyroscope has already started heap profiling');
        return;
    }
    startHeapCollecting();
    heapProfilingTimer = setInterval(() => {
        (0, index_1.log)('Collecting heap profile');
        const profile = pprof.heap.profile(undefined, index_1.config.sm);
        (0, index_1.log)('Heap profile collected...');
        (0, index_1.uploadProfile)(profile).then(() => (0, index_1.log)('Heap profile uploaded...'));
    }, index_1.INTERVAL);
}
exports.startHeapProfiling = startHeapProfiling;
function stopHeapCollecting() {
    pprof.heap.stop();
    isHeapCollectingStarted = false;
}
exports.stopHeapCollecting = stopHeapCollecting;
function stopHeapProfiling() {
    if (heapProfilingTimer) {
        (0, index_1.log)('Stopping heap profiling');
        clearInterval(heapProfilingTimer);
        heapProfilingTimer = undefined;
        stopHeapCollecting();
    }
}
exports.stopHeapProfiling = stopHeapProfiling;
