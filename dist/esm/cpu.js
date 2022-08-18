/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { CpuProfiler, encode } from '@datadog/pprof';
import debug from 'debug';
const log = debug('pyroscope::cpu');
import { checkConfigured, config, INTERVAL, processProfile, SAMPLERATE, uploadProfile, } from './index';
const cpuProfiler = new CpuProfiler();
let cpuProfilingTimer = undefined;
export function isCpuProfilingRunning() {
    return cpuProfilingTimer !== undefined;
}
export function startCpuProfiling() {
    checkConfigured();
    log('Pyroscope has started CPU Profiling');
    cpuProfiler.start(SAMPLERATE);
    if (cpuProfilingTimer) {
        log('Pyroscope has already started cpu profiling');
        return;
    }
    cpuProfilingTimer = setInterval(() => {
        log('Continously collecting cpu profile');
        const profile = fixNanosecondsPeriod(cpuProfiler.profile());
        if (profile) {
            log('Continuous cpu profile collected. Going to upload');
            uploadProfile(profile).then(() => log('CPU profile uploaded...'));
        }
        else {
            log('Cpu profile collection failed');
        }
    }, INTERVAL);
}
export function stopCpuCollecting() {
    cpuProfiler.stop();
}
export function stopCpuProfiling() {
    if (cpuProfilingTimer) {
        log('Stopping heap profiling');
        clearInterval(cpuProfilingTimer);
        cpuProfilingTimer = undefined;
        stopCpuCollecting();
    }
}
// This is in conflict with pprof typings. Not sure why
export function setCpuLabels(labels) {
    cpuProfiler.labels = labels;
}
export function getCpuLabels() {
    return cpuProfiler.labels;
}
export function tag(key, value) {
    cpuProfiler.labels = { ...cpuProfiler.labels, [key]: value };
}
export function fixNanosecondsPeriod(profile) {
    return { ...profile, period: 10000000 };
}
export function collectCpu(seconds) {
    if (!config.configured) {
        throw 'Pyroscope is not configured. Please call init() first.';
    }
    log('Pyroscope has started CPU Profiling');
    cpuProfiler.start(100);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            log('Collecting cpu profile');
            const profile = cpuProfiler.profile();
            if (profile) {
                log('Cpu profile collected. Now processing');
                const newProfile = fixNanosecondsPeriod(processProfile(profile));
                if (newProfile) {
                    log('Processed profile. Now encoding to pprof format');
                    return encode(newProfile)
                        .then((profile) => {
                        log('Encoded profile. Stopping cpu profiling');
                        cpuProfiler.stop();
                        return resolve(profile);
                    })
                        .catch((e) => {
                        log('Error while encoding profile');
                        return new Buffer('', 'utf-8');
                    });
                }
            }
            else {
                log('Cpu profile collection failed');
            }
            log('Stopping cpuProfiler');
            cpuProfiler.stop();
            reject(new Buffer('', 'utf-8'));
        }, seconds * 1000);
    });
}
export function tagWrapper(tags, fn, ...args) {
    cpuProfiler.labels = { ...cpuProfiler.labels, ...tags };
    fn(...args);
    Object.keys(tags).forEach((key) => {
        cpuProfiler.labels[key] = undefined;
    });
}
