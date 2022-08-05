import * as pprof from '@datadog/pprof';
import { config, processProfile, log, INTERVAL, checkConfigured, uploadProfile, } from './index';
let isWallProfilingRunning = false;
export async function collectWall(seconds) {
    if (!config.configured) {
        throw 'Pyroscope is not configured. Please call init() first.';
    }
    try {
        ;
        process._startProfilerIdleNotifier();
        const profile = await pprof.time.profile({
            lineNumbers: true,
            sourceMapper: config.sm,
            durationMillis: (seconds || 10) * 1000 || INTERVAL,
            intervalMicros: 10000,
        });
        process._stopProfilerIdleNotifier();
        const newProfile = processProfile(profile);
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
export function startWallProfiling() {
    checkConfigured();
    log('Pyroscope has started Wall Profiling');
    isWallProfilingRunning = true;
    process._startProfilerIdleNotifier();
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
            if (isWallProfilingRunning) {
                setImmediate(profilingRound);
            }
            log('Wall Profile uploading');
            return uploadProfile(profile);
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
    isWallProfilingRunning = false;
    process._stopProfilerIdleNotifier();
}
