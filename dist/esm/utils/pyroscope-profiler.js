let pyroscopeProfiler;
function assertInitialized(pyroscopeProfiler) {
    if (pyroscopeProfiler === undefined) {
        throw new Error('Pyroscope is not configured. Please call init() first.');
    }
}
export function getProfiler() {
    assertInitialized(pyroscopeProfiler);
    return pyroscopeProfiler;
}
export function setProfiler(value) {
    pyroscopeProfiler = value;
}
