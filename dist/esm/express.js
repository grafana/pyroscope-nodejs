import * as Pyroscope from './index.js';
import debug from 'debug';
const log = debug('pyroscope');
async function handlerCpu(req, res) {
    log('Collecting Cpu for', req.query.seconds);
    try {
        const p = await Pyroscope.collectCpu(Number(req.query.seconds));
        res.status(200).send(p);
    }
    catch (e) {
        log('Error collecting cpu', e);
        res.sendStatus(500);
    }
    res.end();
}
async function handlerHeap(req, res) {
    log('Fetching Heap Profile');
    try {
        const p = await Pyroscope.collectHeap();
        res.status(200).send(p);
    }
    catch (e) {
        log('Error collecting Heap', e);
        res.sendStatus(500);
    }
    res.end();
}
export default function expressMiddleware() {
    Pyroscope.startHeapCollecting();
    return (req, res, next) => {
        if (req.method === 'GET' && req.path === '/debug/pprof/profile') {
            return handlerCpu(req, res).then(() => next());
        }
        if (req.method === 'GET' && req.path === '/debug/pprof/heap') {
            return handlerHeap(req, res).then(() => next());
        }
        next();
    };
}
