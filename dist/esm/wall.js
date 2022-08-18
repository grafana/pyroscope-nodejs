import * as pprof from '@datadog/pprof';
import { fixNanosecondsPeriod } from './cpu';
import { config, processProfile, log, INTERVAL, checkConfigured, uploadProfile, } from './index';
let _isWallProfilingRunning = false;
export function isWallProfilingRunning() {
    return _isWallProfilingRunning;
}
export async function collectWall(seconds) {
    if (!config.configured) {
        throw 'Pyroscope is not configured. Please call init() first.';
    }
    try {
        _isWallProfilingRunning = true;
        const profile = await pprof.time.profile({
            lineNumbers: true,
            sourceMapper: config.sm,
            durationMillis: (seconds || 10) * 1000 || INTERVAL,
            intervalMicros: 10000,
        });
        stopWallProfiling();
        const newProfile = processProfile(fixNanosecondsPeriod(profile));
        if (newProfile) {
            return pprof.encode(newProfile);
        }
        else {
            return Buffer.from('', 'utf8');
        }
    }
    catch (e) {
        log(e);
        return Buffer.from('', 'utf8');
    }
}
export function processCpuProfile(profile) {
    return { ...profile, period: 10000000 };
}
export function startWallProfiling() {
    checkConfigured();
    log('Pyroscope has started Wall Profiling');
    _isWallProfilingRunning = true;
    const profilingRound = () => {
        log('Collecting Wall Profile');
        pprof.time
            .profile({
            lineNumbers: true,
            sourceMapper: config.sm,
            durationMillis: INTERVAL,
            intervalMicros: 10000,
        })
            .then((profile) => {
            log('Wall Profile collected');
            if (_isWallProfilingRunning) {
                setImmediate(profilingRound);
            }
            log('Wall Profile uploading');
            return uploadProfile(fixNanosecondsPeriod(profile));
        })
            .then((d) => {
            log('Wall Profile has been uploaded');
        })
            .catch((e) => {
            log(e);
        });
    };
    profilingRound();
}
// It doesn't stop it immediately, just wait until it ends
export function stopWallProfiling() {
    _isWallProfilingRunning = false;
    process._stopProfilerIdleNotifier();
}
