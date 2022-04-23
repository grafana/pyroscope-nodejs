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
exports.stopHeapProfiling = exports.startHeapProfiling = exports.stopWallProfiling = exports.startWallProfiling = exports.stopCpuProfiling = exports.startCpuProfiling = exports.processProfile = exports.init = void 0;
const pprof = __importStar(require("@datadog/pprof"));
const profile_1 = __importDefault(require("@datadog/pprof/proto/profile"));
const debug_1 = __importDefault(require("debug"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const log = (0, debug_1.default)('pyroscope');
const INTERVAL = 10000;
const SAMPLERATE = 100;
// Base sampling interval, constant for pyroscope
const DEFAULT_SERVER = 'http://localhost:4040';
const config = {
    server: DEFAULT_SERVER,
    autoStart: true,
    name: 'nodejs',
    sm: undefined,
    tags: {},
};
function init(c = {
    server: DEFAULT_SERVER,
    autoStart: true,
    name: 'nodejs',
    tags: {},
}) {
    if (c) {
        config.server = c.server || DEFAULT_SERVER;
        config.sourceMapPath = c.sourceMapPath;
        config.name = c.name || 'nodejs';
        if (!!config.sourceMapPath) {
            pprof.SourceMapper.create(config.sourceMapPath)
                .then((sm) => (config.sm = sm))
                .catch((e) => {
                log(e);
            });
        }
        config.tags = c.tags;
    }
    if (c && c.autoStart) {
        startWallProfiling();
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
const processProfile = (profile) => {
    const newProfile = profile.location?.reduce((a, location, i) => {
        // location -> function -> name
        if (location && location.line && a.stringTable) {
            const functionId = location.line[0]?.functionId;
            const functionCtx = a.function?.find((x) => x.id == functionId);
            const newNameId = a.stringTable.length;
            const functionName = a.stringTable[Number(functionCtx?.name)];
            if (functionName.indexOf(':') === -1) {
                const newName = `${a.stringTable[Number(functionCtx?.filename)]}:${a.stringTable[Number(functionCtx?.name)]}:${location?.line[0].line}`.replace(process.cwd(), '.');
                if (functionCtx) {
                    functionCtx.name = newNameId;
                }
                return {
                    ...a,
                    location: [...(a.location || [])],
                    stringTable: [...(a.stringTable || []), newName],
                };
            }
            else {
                return a;
            }
        }
        return {};
    }, profile);
    return newProfile;
};
exports.processProfile = processProfile;
async function uploadProfile(profile) {
    debugger;
    // Apply labels to all samples
    const newProfile = profile;
    if (newProfile) {
        const buf = await pprof.encode(newProfile);
        const formData = new form_data_1.default();
        formData.append('profile', buf, {
            knownLength: buf.byteLength,
            contentType: 'text/json',
            filename: 'profile',
        });
        const tagList = config.tags
            ? Object.keys(config.tags).map((t) => `${t}=${config.tags[t]}`)
            : '';
        const url = `${config.server}/ingest?name=${config.name}{${tagList}}&sampleRate=${SAMPLERATE}`;
        log(`Sending data to ${url}`);
        // send data to the server
        return (0, axios_1.default)(url, {
            method: 'POST',
            headers: formData.getHeaders(),
            data: formData,
        }).catch(handleError);
    }
}
const tagListToLabels = (tags) => Object.keys(tags).map((t) => profile_1.default.perftools.profiles.Label.create({
    key: t,
    str: tags[t],
}));
// Could be false or a function to stop heap profiling
let heapProfilingTimer = undefined;
let isCpuProfilingRunning = false;
const fs_1 = __importDefault(require("fs"));
let chunk = 0;
const writeProfileAsync = (profile) => {
    pprof.encode(profile).then((buf) => {
        fs_1.default.writeFile(`${config.name}-${chunk}.pb.gz`, buf, (err) => {
            if (err)
                throw err;
            console.log('Chunk written');
            chunk += 1;
        });
    });
};
let cpuProfilerTimer = undefined;
let cpuProfiler = undefined;
function startCpuProfiling(tags) {
    cpuProfiler = new pprof.CpuProfiler();
    cpuProfiler.start(100.0);
    log('Pyroscope has started CPU Profiling');
    cpuProfiler.labels = tags;
    const profilingRound = () => {
        log('Collecting CPU Profile');
        const profile = cpuProfiler.profile();
        log('Cpu Profile collected');
        writeProfileAsync(profile);
        if (profile) {
            uploadProfile(profile).then(() => {
                log('CPU Profile uploading');
            });
        }
    };
    cpuProfilerTimer = setInterval(profilingRound, INTERVAL);
}
exports.startCpuProfiling = startCpuProfiling;
function stopCpuProfiling() {
    if (cpuProfilerTimer) {
        cpuProfiler.stop();
        clearTimeout(cpuProfilerTimer);
    }
}
exports.stopCpuProfiling = stopCpuProfiling;
function startWallProfiling(tags = {}) {
    log('Pyroscope has started Wall Profiling');
    isCpuProfilingRunning = true;
    const profilingRound = () => {
        log('Collecting Wall Profile');
        pprof.time
            .profile({
            lineNumbers: true,
            sourceMapper: config.sm,
            durationMillis: INTERVAL,
            intervalMicros: 10000,
        })
            .then((profile) => {
            log('Wall Profile collected');
            if (isCpuProfilingRunning) {
                setImmediate(profilingRound);
            }
            log('Wall Profile uploading');
            return uploadProfile(profile);
        })
            .then((d) => {
            log('Wall Profile has been uploaded');
        })
            .catch((e) => {
            log(e);
        });
    };
    profilingRound();
}
exports.startWallProfiling = startWallProfiling;
// It doesn't stop it immediately, just wait until it ends
async function stopWallProfiling() {
    isCpuProfilingRunning = false;
}
exports.stopWallProfiling = stopWallProfiling;
async function startHeapProfiling(tags = {}) {
    const intervalBytes = 1024 * 512;
    const stackDepth = 32;
    if (heapProfilingTimer)
        return false;
    log('Pyroscope has started heap profiling');
    pprof.heap.start(intervalBytes, stackDepth);
    heapProfilingTimer = setInterval(async () => {
        log('Collecting heap profile');
        const profile = pprof.heap.profile(undefined, config.sm);
        log('Heap profile collected...');
        await uploadProfile(profile);
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
    startWallProfiling,
    stopWallProfiling,
    startHeapProfiling,
    stopHeapProfiling,
};
if (module.parent && module.parent.id === 'internal/preload') {
    // Start profiling with default config
    init();
    process.on('exit', () => {
        log('Exiting gracefully...');
        log('All non-saved data would be discarded');
    });
}
