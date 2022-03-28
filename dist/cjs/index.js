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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopHeapProfiling = exports.startHeapProfiling = exports.stopCpuProfiling = exports.startCpuProfiling = exports.init = void 0;
const pprof = __importStar(require("pprof"));
const profile_1 = __importDefault(require("pprof/proto/profile"));
const debug_1 = __importDefault(require("debug"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const log = (0, debug_1.default)('pyroscope');
const INTERVAL = 10000;
const SAMPLERATE = 1000;
// Base sampling interval, constant for pyroscope
const DEFAULT_SERVER = 'http://localhost:4040';
const DEFAULT_SOURCEMAP_PATH = [process.cwd()];
const config = {
    server: DEFAULT_SERVER,
    autoStart: true,
    name: 'nodejs',
};
function init(c = {
    server: DEFAULT_SERVER,
    autoStart: true,
    name: 'nodejs',
}) {
    if (c) {
        config.server = c.server || DEFAULT_SERVER;
        config.sourceMapPath = c.sourceMapPath || DEFAULT_SOURCEMAP_PATH;
    }
    if (c && c.autoStart) {
        startCpuProfiling();
        startHeapProfiling();
    }
}
exports.init = init;
function handleError(error) {
    if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        log('Pyroscope received error while ingesting data to server');
        log(error.response.data);
    }
    else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        log('Error when ingesting data to server:', error.message);
    }
    else {
        // Something happened in setting up the request that triggered an Error
        log('Error', error.message);
    }
}
async function uploadProfile(profile, tags) {
    // Apply labels to all samples
    profile.sample?.forEach((t) => (t.label = tags));
    const buf = await pprof.encode(profile);
    const formData = new form_data_1.default();
    formData.append('profile', buf, {
        knownLength: buf.byteLength,
        contentType: 'text/json',
        filename: 'profile',
    });
    // send data to the server
    return (0, axios_1.default)(`${config.server}/ingest?name=${config.name}&sampleRate=${SAMPLERATE}`, {
        method: 'POST',
        headers: formData.getHeaders(),
        data: formData,
    }).catch(handleError);
}
let isCpuProfilingEnabled = true;
const tagListToLabels = (tags) => Object.keys(tags).map((t) => profile_1.default.perftools.profiles.Label.create({
    key: t,
    str: tags[t],
}));
async function startCpuProfiling(tags = {}) {
    isCpuProfilingEnabled = true;
    log('Pyroscope has started CPU Profiling');
    const sourceMapPath = config.sourceMapPath || [process.cwd()];
    const sm = await pprof.SourceMapper.create(sourceMapPath);
    while (isCpuProfilingEnabled) {
        log('Collecting CPU Profile');
        const profile = await pprof.time.profile({
            lineNumbers: true,
            sourceMapper: sm,
            durationMillis: INTERVAL,
        });
        console.log(profile);
        log('CPU Profile uploaded');
        await uploadProfile(profile, tagListToLabels(tags));
        log('CPU Profile has been uploaded');
    }
}
exports.startCpuProfiling = startCpuProfiling;
async function stopCpuProfiling() {
    isCpuProfilingEnabled = false;
}
exports.stopCpuProfiling = stopCpuProfiling;
// Could be false or a function to stop heap profiling
let heapProfilingTimer = undefined;
async function startHeapProfiling(tags = {}) {
    const intervalBytes = 1024 * 512;
    const stackDepth = 32;
    if (heapProfilingTimer)
        return false;
    log('Pyroscope has started heap profiling');
    const sm = await pprof.SourceMapper.create([process.cwd()]);
    pprof.heap.start(intervalBytes, stackDepth);
    heapProfilingTimer = setInterval(async () => {
        log('Collecting heap profile');
        const profile = pprof.heap.profile(undefined, sm);
        log('Heap profile collected...');
        await uploadProfile(profile, tagListToLabels(tags));
        log('Heap profile uploaded...');
    }, INTERVAL);
}
exports.startHeapProfiling = startHeapProfiling;
function stopHeapProfiling() {
    if (heapProfilingTimer) {
        log('Stopping heap profiling');
        clearInterval(heapProfilingTimer);
        heapProfilingTimer = undefined;
    }
}
exports.stopHeapProfiling = stopHeapProfiling;
exports.default = {
    init,
    startCpuProfiling,
    stopCpuProfiling,
    startHeapProfiling,
    stopHeapProfiling,
};
