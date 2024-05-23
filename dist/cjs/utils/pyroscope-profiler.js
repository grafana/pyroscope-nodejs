"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setProfiler = exports.getProfiler = void 0;
let pyroscopeProfiler;
function assertInitialized(pyroscopeProfiler) {
    if (pyroscopeProfiler === undefined) {
        throw new Error('Pyroscope is not configured. Please call init() first.');
    }
}
function getProfiler() {
    assertInitialized(pyroscopeProfiler);
    return pyroscopeProfiler;
}
exports.getProfiler = getProfiler;
function setProfiler(value) {
    pyroscopeProfiler = value;
}
exports.setProfiler = setProfiler;
