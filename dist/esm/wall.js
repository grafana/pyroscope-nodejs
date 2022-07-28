import * as pprof from '@datadog/pprof';
import { config, processProfile, log, INTERVAL, checkConfigured, uploadProfile, } from './index';
import util from 'util';
let isWallProfilingRunning = false;
export async function collectWall(seconds) {
    if (!config.configured) {
        throw 'Pyroscope is not configured. Please call init() first.';
    }
    try {
        const profile = await pprof.time.profile({
            lineNumbers: true,
            sourceMapper: config.sm,
            durationMillis: (seconds || 10) * 1000 || INTERVAL,
            intervalMicros: 10000,
        });
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
    log('Pyroscope has started CPU Profiling');
    isWallProfilingRunning = true;
    const profilingRound = () => {
        log('Collecting CPU Profile');
        pprof.time
            .profile({
            lineNumbers: true,
            sourceMapper: config.sm,
            durationMillis: INTERVAL,
            intervalMicros: 10000,
        })
            .then((profile) => {
            log('CPU Profile collected');
            if (isWallProfilingRunning) {
                setImmediate(profilingRound);
            }
            log('CPU Profile uploading');
            console.log(util.inspect(profile, true, null, true));
            return uploadProfile(profile);
        })
            .then((d) => {
            log('CPU Profile has been uploaded');
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
}
