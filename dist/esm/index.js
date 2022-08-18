import * as pprof from '@datadog/pprof';
import debug from 'debug';
import axios from 'axios';
import FormData from 'form-data';
import { EventEmitter } from 'events';
export const log = debug('pyroscope');
export const emitter = new EventEmitter();
const cloudHostnameSuffix = 'pyroscope.cloud';
export const INTERVAL = 10000;
export const SAMPLERATE = 100;
export const config = {
    serverAddress: process.env['PYROSCOPE_SERVER_ADDRESS'],
    appName: process.env['PYROSCOPE_APPLICATION_NAME'] || '',
    sm: undefined,
    tags: {},
    authToken: process.env['PYROSCOPE_AUTH_TOKEN'],
    configured: false,
};
export function init(c = {}) {
    config.serverAddress = c.serverAddress || config.serverAddress;
    config.appName = c.appName || config.appName;
    config.sourceMapPath = c.sourceMapPath || config.sourceMapPath;
    config.authToken = c.authToken || config.authToken;
    config.tags = c.tags || config.tags;
    if (!!config.sourceMapPath) {
        pprof.SourceMapper.create(config.sourceMapPath)
            .then((sm) => (config.sm = sm))
            .catch((e) => {
            log(e);
        });
    }
    if (config.serverAddress &&
        config.serverAddress?.indexOf(cloudHostnameSuffix) !== -1 &&
        !config.authToken) {
        log('Pyroscope is running on a cloud server, but no authToken was provided. Pyroscope will not be able to ingest data.');
        return;
    }
    config.configured = true;
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
export const processProfile = (profile) => {
    const replacements = {
        objects: 'inuse_objects',
        space: 'inuse_space',
        sample: 'samples',
    };
    // Replace the names of the samples to meet golang naming
    const newStringTable = profile.stringTable
        ?.slice(0, 5)
        .map((s) => (replacements[s] ? replacements[s] : s))
        .concat(profile.stringTable?.slice(5));
    // Inject line numbers and file names into symbols table
    const newProfile = profile.location?.reduce((a, location) => {
        // location -> function -> name
        if (location && location.line && a.stringTable) {
            const functionId = location.line[0]?.functionId;
            // Find the function name
            const functionCtx = a.function?.find((x) => x.id == functionId);
            // Store the new position of injected function name
            const newNameId = a.stringTable.length;
            // Get the function name
            const functionName = a.stringTable[Number(functionCtx?.name)];
            if (functionName.indexOf(':') === -1) {
                // Build a new name by concatenating the file name and line number
                const newName = `${a.stringTable[Number(functionCtx?.filename)]}:${a.stringTable[Number(functionCtx?.name)]}:${location?.line[0].line}`.replace(process.cwd(), '.');
                // Store the new name
                if (functionCtx) {
                    functionCtx.name = newNameId;
                }
                // Update profile string table with the new name and location
                return {
                    ...a,
                    location: [...(a.location || [])],
                    stringTable: [...(a.stringTable || []), newName],
                };
            }
            else {
                return a;
            }
        }
        return {};
    }, {
        ...profile,
        stringTable: newStringTable,
    });
    return newProfile;
};
export async function uploadProfile(profile) {
    // Apply labels to all samples
    const newProfile = processProfile(profile);
    if (newProfile) {
        const buf = await pprof.encode(newProfile);
        const formData = new FormData();
        formData.append('profile', buf, {
            knownLength: buf.byteLength,
            contentType: 'text/json',
            filename: 'profile',
        });
        const tagList = config.tags
            ? Object.keys(config.tags).map((t) => `${encodeURIComponent(t)}=${encodeURIComponent(config.tags[t])}`)
            : '';
        const url = `${config.serverAddress}/ingest?name=${encodeURIComponent(config.appName)}{${tagList}}&sampleRate=${SAMPLERATE}&spyName=nodespy`;
        log(`Sending data to ${url}`);
        // send data to the server
        return axios(url, {
            method: 'POST',
            headers: config.authToken
                ? {
                    ...formData.getHeaders(),
                    Authorization: `Bearer ${config.authToken}`,
                }
                : formData.getHeaders(),
            data: formData,
        }).catch(handleError);
    }
}
export function checkConfigured() {
    if (!config.configured) {
        throw 'Pyroscope is not configured. Please call init() first.';
    }
    if (!config.serverAddress) {
        throw 'Please set the server address in the init()';
    }
    if (!config.appName) {
        throw 'Please define app name in the init()';
    }
}
export function start() {
    startCpuProfiling();
    startHeapProfiling();
}
export function stop() {
    stopCpuProfiling();
    stopHeapProfiling();
}
// CPU Export
import { startCpuProfiling, stopCpuProfiling, setCpuLabels, getCpuLabels, tagWrapper, tag, collectCpu, } from './cpu.js';
export { startCpuProfiling, stopCpuProfiling, setCpuLabels, getCpuLabels, collectCpu, tagWrapper, tag, };
// Heap Export
import { startHeapProfiling, stopHeapProfiling, collectHeap, startHeapCollecting, stopHeapCollecting, } from './heap.js';
export { startHeapProfiling, stopHeapProfiling, collectHeap, startHeapCollecting, stopHeapCollecting, };
// Wall Export
import { startWallProfiling, stopWallProfiling, collectWall } from './wall.js';
export { startWallProfiling, stopWallProfiling, collectWall };
import expressMiddleware from './express.js';
export { expressMiddleware };
export default {
    init,
    startCpuProfiling,
    stopCpuProfiling,
    startWallProfiling,
    stopWallProfiling,
    startHeapProfiling,
    stopHeapProfiling,
    collectCpu,
    collectWall,
    collectHeap,
    startHeapCollecting,
    stopHeapCollecting,
    start,
    stop,
    emitter,
    expressMiddleware,
};
