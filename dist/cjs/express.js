"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Pyroscope = __importStar(require("./index.js"));
const debug_1 = __importDefault(require("debug"));
const log = (0, debug_1.default)('pyroscope');
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
function expressMiddleware() {
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
exports.default = expressMiddleware;
