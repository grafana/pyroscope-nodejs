"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stop = exports.start = exports.wrapWithWallLabels = exports.init = void 0;
require("regenerator-runtime/runtime");
const middleware_1 = __importDefault(require("./express/middleware"));
const pyroscope_profiler_1 = require("./profilers/pyroscope-profiler");
const check_pyroscope_config_1 = require("./utils/check-pyroscope-config");
const pyroscope_profiler_2 = require("./utils/pyroscope-profiler");
const process_config_1 = require("./utils/process-config");
const get_env_1 = require("./utils/get-env");
const pprof_1 = require("@datadog/pprof");
function init(config = {}) {
    (0, check_pyroscope_config_1.checkPyroscopeConfig)(config);
    const processedConfig = (0, process_config_1.processConfig)(config, (0, get_env_1.getEnv)());
    (0, pyroscope_profiler_2.setProfiler)(new pyroscope_profiler_1.PyroscopeProfiler(processedConfig));
}
exports.init = init;
function getWallLabels() {
    return (0, pyroscope_profiler_2.getProfiler)().wallProfiler.profiler.getLabels();
}
function setWallLabels(labels) {
    (0, pyroscope_profiler_2.getProfiler)().wallProfiler.profiler.setLabels(labels);
}
function wrapWithWallLabels(lbls, fn, ...args) {
    (0, pyroscope_profiler_2.getProfiler)().wallProfiler.profiler.wrapWithLabels(lbls, fn, ...args);
}
exports.wrapWithWallLabels = wrapWithWallLabels;
function startWallProfiling() {
    (0, pyroscope_profiler_2.getProfiler)().wallProfiler.start();
}
// here for backwards compatibility
function startCpuProfiling() {
    (0, pyroscope_profiler_2.getProfiler)().wallProfiler.start();
}
async function stopWallProfiling() {
    await (0, pyroscope_profiler_2.getProfiler)().wallProfiler.stop();
}
// here for backwards compatibility
async function stopCpuProfiling() {
    await (0, pyroscope_profiler_2.getProfiler)().wallProfiler.stop();
}
function startHeapProfiling() {
    (0, pyroscope_profiler_2.getProfiler)().heapProfiler.start();
}
async function stopHeapProfiling() {
    await (0, pyroscope_profiler_2.getProfiler)().heapProfiler.stop();
}
function start() {
    startWallProfiling();
    startHeapProfiling();
}
exports.start = start;
async function stop() {
    await Promise.all([stopWallProfiling(), stopHeapProfiling()]);
}
exports.stop = stop;
exports.default = {
    SourceMapper: pprof_1.SourceMapper,
    expressMiddleware: middleware_1.default,
    init,
    getWallLabels,
    setWallLabels,
    wrapWithWallLabels,
    start,
    startHeapProfiling,
    startWallProfiling,
    startCpuProfiling,
    stop,
    stopHeapProfiling,
    stopWallProfiling,
    stopCpuProfiling,
    setLogger: pprof_1.setLogger,
};
