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
exports.stopWallProfiling = exports.startWallProfiling = exports.collectWall = void 0;
const pprof = __importStar(require("@datadog/pprof"));
const index_1 = require("./index");
let isWallProfilingRunning = false;
async function collectWall(seconds) {
    if (!index_1.config.configured) {
        throw 'Pyroscope is not configured. Please call init() first.';
    }
    try {
        const profile = await pprof.time.profile({
            lineNumbers: true,
            sourceMapper: index_1.config.sm,
            durationMillis: (seconds || 10) * 1000 || index_1.INTERVAL,
            intervalMicros: 10000,
        });
        const newProfile = (0, index_1.processProfile)(profile);
        if (newProfile) {
            return pprof.encode(newProfile);
        }
        else {
            return Buffer.from('', 'utf8');
        }
    }
    catch (e) {
        (0, index_1.log)(e);
        return Buffer.from('', 'utf8');
    }
}
exports.collectWall = collectWall;
function startWallProfiling() {
    (0, index_1.checkConfigured)();
    (0, index_1.log)('Pyroscope has started CPU Profiling');
    isWallProfilingRunning = true;
    const profilingRound = () => {
        (0, index_1.log)('Collecting CPU Profile');
        pprof.time
            .profile({
            lineNumbers: true,
            sourceMapper: index_1.config.sm,
            durationMillis: index_1.INTERVAL,
            intervalMicros: 10000,
        })
            .then((profile) => {
            (0, index_1.log)('CPU Profile collected');
            if (isWallProfilingRunning) {
                setImmediate(profilingRound);
            }
            (0, index_1.log)('CPU Profile uploading');
            return (0, index_1.uploadProfile)(profile);
        })
            .then((d) => {
            (0, index_1.log)('CPU Profile has been uploaded');
        })
            .catch((e) => {
            (0, index_1.log)(e);
        });
    };
    profilingRound();
}
exports.startWallProfiling = startWallProfiling;
// It doesn't stop it immediately, just wait until it ends
function stopWallProfiling() {
    isWallProfilingRunning = false;
}
exports.stopWallProfiling = stopWallProfiling;
