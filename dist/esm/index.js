import 'regenerator-runtime/runtime';
import expressMiddleware from './express/middleware';
import { PyroscopeProfiler } from './profilers/pyroscope-profiler';
import { checkPyroscopeConfig } from './utils/check-pyroscope-config';
import { getProfiler, setProfiler } from './utils/pyroscope-profiler';
import { processConfig } from './utils/process-config';
import { getEnv } from './utils/get-env';
import { SourceMapper, setLogger } from '@datadog/pprof';
export function init(config = {}) {
    checkPyroscopeConfig(config);
    const processedConfig = processConfig(config, getEnv());
    setProfiler(new PyroscopeProfiler(processedConfig));
}
function getWallLabels() {
    return getProfiler().wallProfiler.profiler.getLabels();
}
function setWallLabels(labels) {
    getProfiler().wallProfiler.profiler.setLabels(labels);
}
export function wrapWithWallLabels(lbls, fn, ...args) {
    getProfiler().wallProfiler.profiler.wrapWithLabels(lbls, fn, ...args);
}
function startWallProfiling() {
    getProfiler().wallProfiler.start();
}
// here for backwards compatibility
function startCpuProfiling() {
    getProfiler().wallProfiler.start();
}
async function stopWallProfiling() {
    await getProfiler().wallProfiler.stop();
}
// here for backwards compatibility
async function stopCpuProfiling() {
    await getProfiler().wallProfiler.stop();
}
function startHeapProfiling() {
    getProfiler().heapProfiler.start();
}
async function stopHeapProfiling() {
    await getProfiler().heapProfiler.stop();
}
export function start() {
    startWallProfiling();
    startHeapProfiling();
}
export async function stop() {
    await Promise.all([stopWallProfiling(), stopHeapProfiling()]);
}
export default {
    SourceMapper,
    expressMiddleware,
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
    setLogger,
};
