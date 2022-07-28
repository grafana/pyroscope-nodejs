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
exports.expressMiddleware = exports.collectWall = exports.stopWallProfiling = exports.startWallProfiling = exports.stopHeapCollecting = exports.startHeapCollecting = exports.collectHeap = exports.stopHeapProfiling = exports.startHeapProfiling = exports.tag = exports.tagWrapper = exports.collectCpu = exports.getCpuLabels = exports.setCpuLabels = exports.stopCpuProfiling = exports.startCpuProfiling = exports.stop = exports.start = exports.checkConfigured = exports.uploadProfile = exports.processProfile = exports.init = exports.config = exports.SAMPLERATE = exports.INTERVAL = exports.log = void 0;
const pprof = __importStar(require("@datadog/pprof"));
const debug_1 = __importDefault(require("debug"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
exports.log = (0, debug_1.default)('pyroscope');
const cloudHostnameSuffix = 'pyroscope.cloud';
exports.INTERVAL = 10000;
exports.SAMPLERATE = 100;
exports.config = {
    serverAddress: process.env['PYROSCOPE_SERVER_ADDRESS'],
    appName: process.env['PYROSCOPE_APPLICATION_NAME'] || '',
    sm: undefined,
    tags: {},
    authToken: process.env['PYROSCOPE_AUTH_TOKEN'],
    configured: false,
};
function init(c = {}) {
    exports.config.serverAddress = c.serverAddress || exports.config.serverAddress;
    exports.config.appName = c.appName || exports.config.appName;
    exports.config.sourceMapPath = c.sourceMapPath || exports.config.sourceMapPath;
    exports.config.authToken = c.authToken || exports.config.authToken;
    exports.config.tags = c.tags || exports.config.tags;
    if (!!exports.config.sourceMapPath) {
        pprof.SourceMapper.create(exports.config.sourceMapPath)
            .then((sm) => (exports.config.sm = sm))
            .catch((e) => {
            (0, exports.log)(e);
        });
    }
    if (exports.config.serverAddress &&
        exports.config.serverAddress?.indexOf(cloudHostnameSuffix) !== -1 &&
        !exports.config.authToken) {
        (0, exports.log)('Pyroscope is running on a cloud server, but no authToken was provided. Pyroscope will not be able to ingest data.');
        return;
    }
    exports.config.configured = true;
}
exports.init = init;
function handleError(error) {
    if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        (0, exports.log)('Pyroscope received error while ingesting data to server');
        (0, exports.log)(error.response.data);
    }
    else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        (0, exports.log)('Error when ingesting data to server:', error.message);
    }
    else {
        // Something happened in setting up the request that triggered an Error
        (0, exports.log)('Error', error.message);
    }
}
const processProfile = (profile) => {
    const replacements = {
        objects: 'inuse_objects',
        space: 'inuse_space',
        sample: 'samples',
    };
    // Replace the names of the samples to meet golang naming
    const newStringTable = profile.stringTable
        ?.slice(0, 5)
        .map((s) => (replacements[s] ? replacements[s] : s))
        .concat(profile.stringTable?.slice(5));
    // Inject line numbers and file names into symbols table
    const newProfile = profile.location?.reduce((a, location) => {
        // location -> function -> name
        if (location && location.line && a.stringTable) {
            const functionId = location.line[0]?.functionId;
            // Find the function name
            const functionCtx = a.function?.find((x) => x.id == functionId);
            // Store the new position of injected function name
            const newNameId = a.stringTable.length;
            // Get the function name
            const functionName = a.stringTable[Number(functionCtx?.name)];
            if (functionName.indexOf(':') === -1) {
                // Build a new name by concatenating the file name and line number
                const newName = `${a.stringTable[Number(functionCtx?.filename)]}:${a.stringTable[Number(functionCtx?.name)]}:${location?.line[0].line}`.replace(process.cwd(), '.');
                // Store the new name
                if (functionCtx) {
                    functionCtx.name = newNameId;
                }
                // Update profile string table with the new name and location
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
    }, {
        ...profile,
        stringTable: newStringTable,
    });
    return newProfile;
};
exports.processProfile = processProfile;
async function uploadProfile(profile) {
    // Apply labels to all samples
    const newProfile = (0, exports.processProfile)(profile);
    if (newProfile) {
        const buf = await pprof.encode(newProfile);
        const formData = new form_data_1.default();
        formData.append('profile', buf, {
            knownLength: buf.byteLength,
            contentType: 'text/json',
            filename: 'profile',
        });
        const tagList = exports.config.tags
            ? Object.keys(exports.config.tags).map((t) => `${encodeURIComponent(t)}=${encodeURIComponent(exports.config.tags[t])}`)
            : '';
        const url = `${exports.config.serverAddress}/ingest?name=${encodeURIComponent(exports.config.appName)}{${tagList}}&sampleRate=${exports.SAMPLERATE}&spyName=nodespy`;
        (0, exports.log)(`Sending data to ${url}`);
        // send data to the server
        return (0, axios_1.default)(url, {
            method: 'POST',
            headers: exports.config.authToken
                ? {
                    ...formData.getHeaders(),
                    Authorization: `Bearer ${exports.config.authToken}`,
                }
                : formData.getHeaders(),
            data: formData,
        }).catch(handleError);
    }
}
exports.uploadProfile = uploadProfile;
function checkConfigured() {
    if (!exports.config.configured) {
        throw 'Pyroscope is not configured. Please call init() first.';
    }
    if (!exports.config.serverAddress) {
        throw 'Please set the server address in the init()';
    }
    if (!exports.config.appName) {
        throw 'Please define app name in the init()';
    }
}
exports.checkConfigured = checkConfigured;
function start() {
    (0, cpu_js_1.startCpuProfiling)();
    (0, heap_js_1.startHeapProfiling)();
}
exports.start = start;
function stop() {
    (0, cpu_js_1.stopCpuProfiling)();
    (0, heap_js_1.stopHeapProfiling)();
}
exports.stop = stop;
// CPU Export
const cpu_js_1 = require("./cpu.js");
Object.defineProperty(exports, "startCpuProfiling", { enumerable: true, get: function () { return cpu_js_1.startCpuProfiling; } });
Object.defineProperty(exports, "stopCpuProfiling", { enumerable: true, get: function () { return cpu_js_1.stopCpuProfiling; } });
Object.defineProperty(exports, "setCpuLabels", { enumerable: true, get: function () { return cpu_js_1.setCpuLabels; } });
Object.defineProperty(exports, "getCpuLabels", { enumerable: true, get: function () { return cpu_js_1.getCpuLabels; } });
Object.defineProperty(exports, "tagWrapper", { enumerable: true, get: function () { return cpu_js_1.tagWrapper; } });
Object.defineProperty(exports, "tag", { enumerable: true, get: function () { return cpu_js_1.tag; } });
Object.defineProperty(exports, "collectCpu", { enumerable: true, get: function () { return cpu_js_1.collectCpu; } });
// Heap Export
const heap_js_1 = require("./heap.js");
Object.defineProperty(exports, "startHeapProfiling", { enumerable: true, get: function () { return heap_js_1.startHeapProfiling; } });
Object.defineProperty(exports, "stopHeapProfiling", { enumerable: true, get: function () { return heap_js_1.stopHeapProfiling; } });
Object.defineProperty(exports, "collectHeap", { enumerable: true, get: function () { return heap_js_1.collectHeap; } });
Object.defineProperty(exports, "startHeapCollecting", { enumerable: true, get: function () { return heap_js_1.startHeapCollecting; } });
Object.defineProperty(exports, "stopHeapCollecting", { enumerable: true, get: function () { return heap_js_1.stopHeapCollecting; } });
// Wall Export
const wall_js_1 = require("./wall.js");
Object.defineProperty(exports, "startWallProfiling", { enumerable: true, get: function () { return wall_js_1.startWallProfiling; } });
Object.defineProperty(exports, "stopWallProfiling", { enumerable: true, get: function () { return wall_js_1.stopWallProfiling; } });
Object.defineProperty(exports, "collectWall", { enumerable: true, get: function () { return wall_js_1.collectWall; } });
const express_js_1 = __importDefault(require("./express.js"));
exports.expressMiddleware = express_js_1.default;
exports.default = {
    init,
    startCpuProfiling: cpu_js_1.startCpuProfiling,
    stopCpuProfiling: cpu_js_1.stopCpuProfiling,
    startWallProfiling: wall_js_1.startWallProfiling,
    stopWallProfiling: wall_js_1.stopWallProfiling,
    startHeapProfiling: heap_js_1.startHeapProfiling,
    stopHeapProfiling: heap_js_1.stopHeapProfiling,
    collectCpu: cpu_js_1.collectCpu,
    collectWall: wall_js_1.collectWall,
    collectHeap: heap_js_1.collectHeap,
    startHeapCollecting: heap_js_1.startHeapCollecting,
    stopHeapCollecting: heap_js_1.stopHeapCollecting,
    start,
    stop,
    expressMiddleware: express_js_1.default,
};
