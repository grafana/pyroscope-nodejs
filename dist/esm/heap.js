import * as pprof from '@datadog/pprof';
import { config, processProfile, checkConfigured, uploadProfile, INTERVAL, log, emitter, } from './index';
// Could be false or a function to stop heap profiling
let heapProfilingTimer = undefined;
export async function collectHeap() {
    if (!config.configured) {
        throw 'Pyroscope is not configured. Please call init() first.';
    }
    log('Collecting heap...');
    const profile = pprof.heap.profile(undefined, config.sm);
    const newProfile = processProfile(profile);
    if (newProfile) {
        return pprof.encode(newProfile);
    }
    else {
        return Buffer.from('', 'utf8');
    }
}
let isHeapCollectingStarted = false;
export function startHeapCollecting() {
    if (!config.configured) {
        throw 'Pyroscope is not configured. Please call init() first.';
    }
    if (isHeapCollectingStarted) {
        log('Heap collecting is already started');
        return;
    }
    const intervalBytes = 1024 * 512;
    const stackDepth = 32;
    log('Pyroscope has started heap profiling');
    pprof.heap.start(intervalBytes, stackDepth);
    isHeapCollectingStarted = true;
}
export function startHeapProfiling() {
    checkConfigured();
    if (heapProfilingTimer) {
        log('Pyroscope has already started heap profiling');
        return;
    }
    startHeapCollecting();
    heapProfilingTimer = setInterval(() => {
        log('Collecting heap profile');
        const profile = pprof.heap.profile(undefined, config.sm);
        emitter.emit('profile', profile);
        log('Heap profile collected...');
        uploadProfile(profile).then(() => log('Heap profile uploaded...'));
    }, INTERVAL);
}
export function stopHeapCollecting() {
    pprof.heap.stop();
    isHeapCollectingStarted = false;
}
export function stopHeapProfiling() {
    if (heapProfilingTimer) {
        log('Stopping heap profiling');
        clearInterval(heapProfilingTimer);
        heapProfilingTimer = undefined;
        stopHeapCollecting();
    }
}
