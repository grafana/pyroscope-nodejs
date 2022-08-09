"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagWrapper = exports.collectCpu = exports.processCpuProfile = exports.tag = exports.getCpuLabels = exports.setCpuLabels = exports.stopCpuProfiling = exports.stopCpuCollecting = exports.startCpuProfiling = exports.isCpuProfilingRunning = void 0;
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
const pprof_1 = require("@datadog/pprof");
const debug_1 = __importDefault(require("debug"));
const log = (0, debug_1.default)('pyroscope::cpu');
const index_1 = require("./index");
const cpuProfiler = new pprof_1.CpuProfiler();
let cpuProfilingTimer = undefined;
function isCpuProfilingRunning() {
    return cpuProfilingTimer !== undefined;
}
exports.isCpuProfilingRunning = isCpuProfilingRunning;
function startCpuProfiling() {
    (0, index_1.checkConfigured)();
    log('Pyroscope has started CPU Profiling');
    cpuProfiler.start(index_1.SAMPLERATE);
    if (cpuProfilingTimer) {
        log('Pyroscope has already started cpu profiling');
        return;
    }
    cpuProfilingTimer = setInterval(() => {
        log('Continously collecting cpu profile');
        const profile = cpuProfiler.profile();
        if (profile) {
            log('Continuous cpu profile collected. Going to upload');
            (0, index_1.uploadProfile)(profile).then(() => log('CPU profile uploaded...'));
        }
        else {
            log('Cpu profile collection failed');
        }
    }, index_1.INTERVAL);
}
exports.startCpuProfiling = startCpuProfiling;
function stopCpuCollecting() {
    cpuProfiler.stop();
}
exports.stopCpuCollecting = stopCpuCollecting;
function stopCpuProfiling() {
    if (cpuProfilingTimer) {
        log('Stopping heap profiling');
        clearInterval(cpuProfilingTimer);
        cpuProfilingTimer = undefined;
        stopCpuCollecting();
    }
}
exports.stopCpuProfiling = stopCpuProfiling;
// This is in conflict with pprof typings. Not sure why
function setCpuLabels(labels) {
    cpuProfiler.labels = labels;
}
exports.setCpuLabels = setCpuLabels;
function getCpuLabels() {
    return cpuProfiler.labels;
}
exports.getCpuLabels = getCpuLabels;
function tag(key, value) {
    cpuProfiler.labels = { ...cpuProfiler.labels, [key]: value };
}
exports.tag = tag;
function processCpuProfile(profile) {
    return { ...profile, period: 10000000 };
}
exports.processCpuProfile = processCpuProfile;
function collectCpu(seconds) {
    if (!index_1.config.configured) {
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
                const newProfile = processCpuProfile((0, index_1.processProfile)(profile));
                if (newProfile) {
                    log('Processed profile. Now encoding to pprof format');
                    return (0, pprof_1.encode)(newProfile)
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
exports.collectCpu = collectCpu;
function tagWrapper(tags, fn, ...args) {
    cpuProfiler.labels = { ...cpuProfiler.labels, ...tags };
    fn(...args);
    Object.keys(tags).forEach((key) => {
        cpuProfiler.labels[key] = undefined;
    });
}
exports.tagWrapper = tagWrapper;
