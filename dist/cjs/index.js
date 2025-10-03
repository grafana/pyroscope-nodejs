"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stop = exports.start = exports.wrapWithLabels = exports.init = void 0;
require("regenerator-runtime/runtime.js");
const pprof_1 = require("@datadog/pprof");
const middleware_js_1 = __importDefault(require("./express/middleware.js"));
const logger_js_1 = require("./logger.js");
const pyroscope_profiler_js_1 = require("./profilers/pyroscope-profiler.js");
const sourcemapper_js_1 = require("./sourcemapper.js");
const check_pyroscope_config_js_1 = require("./utils/check-pyroscope-config.js");
const get_env_js_1 = require("./utils/get-env.js");
const process_config_js_1 = require("./utils/process-config.js");
const pyroscope_profiler_js_2 = require("./utils/pyroscope-profiler.js");
function init(config = {}) {
    (0, check_pyroscope_config_js_1.checkPyroscopeConfig)(config);
    const processedConfig = (0, process_config_js_1.processConfig)(config, (0, get_env_js_1.getEnv)());
    (0, pyroscope_profiler_js_2.setProfiler)(new pyroscope_profiler_js_1.PyroscopeProfiler(processedConfig));
}
exports.init = init;
// deprecated: please use getLabels
function getWallLabels() {
    return getLabels();
}
// deprecated: please use setLabels
function setWallLabels(labels) {
    return setLabels(labels);
}
function getLabels() {
    return (0, pyroscope_profiler_js_2.getProfiler)().wallProfiler.profiler.getLabels();
}
function setLabels(labels) {
    (0, pyroscope_profiler_js_2.getProfiler)().wallProfiler.profiler.setLabels(labels);
}
function wrapWithLabels(lbls, fn, ...args) {
    (0, pyroscope_profiler_js_2.getProfiler)().wallProfiler.profiler.wrapWithLabels(lbls, fn, ...args);
}
exports.wrapWithLabels = wrapWithLabels;
function startWallProfiling() {
    (0, pyroscope_profiler_js_2.getProfiler)().wallProfiler.start();
}
// here for backwards compatibility
function startCpuProfiling() {
    (0, pyroscope_profiler_js_2.getProfiler)().wallProfiler.start();
}
async function stopWallProfiling() {
    await (0, pyroscope_profiler_js_2.getProfiler)().wallProfiler.stop();
}
// here for backwards compatibility
async function stopCpuProfiling() {
    await (0, pyroscope_profiler_js_2.getProfiler)().wallProfiler.stop();
}
function startHeapProfiling() {
    (0, pyroscope_profiler_js_2.getProfiler)().heapProfiler.start();
}
async function stopHeapProfiling() {
    await (0, pyroscope_profiler_js_2.getProfiler)().heapProfiler.stop();
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
function setLogger(logger) {
    (0, pprof_1.setLogger)(logger);
    (0, logger_js_1.setLogger)(logger);
}
exports.default = {
    SourceMapper: sourcemapper_js_1.SourceMapper,
    expressMiddleware: middleware_js_1.default,
    init,
    getProfiler: pyroscope_profiler_js_2.getProfiler,
    getWallLabels,
    setWallLabels,
    getLabels,
    setLabels,
    wrapWithLabels,
    start,
    startHeapProfiling,
    startWallProfiling,
    startCpuProfiling,
    stop,
    stopHeapProfiling,
    stopWallProfiling,
    stopCpuProfiling,
    setLogger,
};
