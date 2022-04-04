import * as pprof from 'pprof';
import perftools from 'pprof/proto/profile';
import debug from 'debug';
import axios from 'axios';
import FormData from 'form-data';
const log = debug('pyroscope');
const INTERVAL = 10000;
const SAMPLERATE = 100;
// Base sampling interval, constant for pyroscope
const DEFAULT_SERVER = 'http://localhost:4040';
const config = {
    server: DEFAULT_SERVER,
    autoStart: true,
    name: 'nodejs',
    sm: undefined,
    tags: {},
};
export function init(c = {
    server: DEFAULT_SERVER,
    autoStart: true,
    name: 'nodejs',
    tags: {},
}) {
    if (c) {
        config.server = c.server || DEFAULT_SERVER;
        config.sourceMapPath = c.sourceMapPath;
        if (!!config.sourceMapPath) {
            pprof.SourceMapper.create(config.sourceMapPath).then((sm) => (config.sm = sm));
        }
        config.tags = c.tags;
    }
    if (c && c.autoStart) {
        startCpuProfiling();
        startHeapProfiling();
    }
}
function handleError(error) {
    if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        log('Pyroscope received error while ingesting data to server');
        log(error.response.data);
    }
    else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        log('Error when ingesting data to server:', error.message);
    }
    else {
        // Something happened in setting up the request that triggered an Error
        log('Error', error.message);
    }
}
async function uploadProfile(profile) {
    // Apply labels to all samples
    const buf = await pprof.encode(profile);
    const formData = new FormData();
    formData.append('profile', buf, {
        knownLength: buf.byteLength,
        contentType: 'text/json',
        filename: 'profile',
    });
    const tagList = Object.keys(config.tags).map((t) => `${t}=${config.tags[t]}`);
    const url = `${config.server}/ingest?name=${config.name}{${tagList}}&sampleRate=${SAMPLERATE}`;
    // send data to the server
    return axios(url, {
        method: 'POST',
        headers: formData.getHeaders(),
        data: formData,
    }).catch(handleError);
}
const tagListToLabels = (tags) => Object.keys(tags).map((t) => perftools.perftools.profiles.Label.create({
    key: t,
    str: tags[t],
}));
// Could be false or a function to stop heap profiling
let heapProfilingTimer = undefined;
let isCpuProfilingRunning = false;
import fs from 'fs';
let chunk = 0;
const writeProfileAsync = (profile) => {
    pprof.encode(profile).then((buf) => {
        fs.writeFile(`${config.name}-${chunk}.pb.gz`, buf, (err) => {
            if (err)
                throw err;
            console.log('Chunk written');
            chunk += 1;
        });
    });
};
export function startCpuProfiling(tags = {}) {
    log('Pyroscope has started CPU Profiling');
    isCpuProfilingRunning = true;
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
            if (isCpuProfilingRunning) {
                setImmediate(profilingRound);
            }
            log('CPU Profile uploading');
            return uploadProfile(profile);
        })
            .then((d) => {
            log('CPU Profile has been uploaded');
        });
    };
    profilingRound();
}
// It doesn't stop it immediately, just wait until it ends
export async function stopCpuProfiling() {
    isCpuProfilingRunning = false;
}
export async function startHeapProfiling(tags = {}) {
    const intervalBytes = 1024 * 512;
    const stackDepth = 32;
    if (heapProfilingTimer)
        return false;
    log('Pyroscope has started heap profiling');
    const sm = await pprof.SourceMapper.create([process.cwd()]);
    pprof.heap.start(intervalBytes, stackDepth);
    heapProfilingTimer = setInterval(async () => {
        log('Collecting heap profile');
        const profile = pprof.heap.profile(undefined, sm);
        log('Heap profile collected...');
        await uploadProfile(profile);
        log('Heap profile uploaded...');
    }, INTERVAL);
}
export function stopHeapProfiling() {
    if (heapProfilingTimer) {
        log('Stopping heap profiling');
        clearInterval(heapProfilingTimer);
        heapProfilingTimer = undefined;
    }
}
export default {
    init,
    startCpuProfiling,
    stopCpuProfiling,
    startHeapProfiling,
    stopHeapProfiling,
};
if (module.parent && module.parent.id === 'internal/preload') {
    // Start profiling with default config
    init();
    process.on('exit', () => {
        log('Exiting gracefully...');
        log('All non-saved data would be discarded');
    });
}
