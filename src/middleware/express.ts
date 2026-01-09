import debug from 'debug';
import type {
  ExpressNextFunction,
  ExpressRequest,
  ExpressResponse,
  ExpressRequestHandler,
} from './types.js';
import { Profile } from 'pprof-format';
import { Profiler } from '../profilers/profiler.js';
import { PyroscopeProfiler } from '../profilers/pyroscope-profiler.js';
import { WallProfilerStartArgs } from '../profilers/wall-profiler.js';
import { getProfiler } from '../utils/pyroscope-profiler.js';
import { encode } from '@datadog/pprof';
import { HeapProfilerStartArgs } from '../profilers/heap-profiler.js';

const log = debug('pyroscope');

async function collectProfile<TStartArgs>(
  profiler: Profiler<TStartArgs>
): Promise<Buffer> {
  const profile: Profile = profiler.profile().profile;

  profiler.stop();

  return encode(profile);
}

async function collectProfileAfterMs<TStartArgs>(
  profiler: Profiler<TStartArgs>,
  args: TStartArgs,
  delayMs: number
): Promise<Buffer> {
  profiler.start(args);

  if (delayMs === 0) {
    return collectProfile(profiler);
  }

  return new Promise(
    (resolve: (buffer: Buffer | PromiseLike<Buffer>) => void) => {
      setTimeout(() => {
        resolve(collectProfile(profiler));
      }, delayMs);
    }
  );
}

function collectHeap(): Promise<Buffer> {
  const profiler: PyroscopeProfiler = getProfiler();

  const heapProfilerArgs: HeapProfilerStartArgs =
    profiler.heapProfiler.startArgs;
  const heapProfiler: Profiler<HeapProfilerStartArgs> =
    profiler.heapProfiler.profiler;

  return collectProfileAfterMs(heapProfiler, heapProfilerArgs, 0);
}

function collectWall(ms: number): Promise<Buffer> {
  const profiler: PyroscopeProfiler = getProfiler();

  const wallProfilerArgs: WallProfilerStartArgs =
    profiler.wallProfiler.startArgs;
  const wallProfiler: Profiler<WallProfilerStartArgs> =
    profiler.wallProfiler.profiler;

  return collectProfileAfterMs(wallProfiler, wallProfilerArgs, ms);
}

function profileExpressHandler(
  profileKind: string,
  useCaseHandler: (req: ExpressRequest) => Promise<Buffer>
): ExpressRequestHandler {
  return async (
    req: ExpressRequest,
    res: ExpressResponse
    // next: ExpressNextFunction
  ): Promise<void> => {
    log(`Fetching ${profileKind} Profile`);
    try {
      const profileBuffer = await useCaseHandler(req);
      res.status(200).send(profileBuffer);
    } catch (error: unknown) {
      log(`Error collecting ${profileKind}`, error);
      res.sendStatus(500);
    }
  };
}

const heapHandler: ExpressRequestHandler = profileExpressHandler('Heap', () =>
  collectHeap()
);

const wallHandler: ExpressRequestHandler = profileExpressHandler(
  'Wall',
  (req: ExpressRequest) => collectWall(1000 * Number(req.query.seconds))
);

export default function expressMiddleware(): (
  req: ExpressRequest,
  res: ExpressResponse,
  next: ExpressNextFunction
) => void {
  return (
    req: ExpressRequest,
    res: ExpressResponse,
    next: ExpressNextFunction
  ) => {
    if (req.method === 'GET') {
      if (req.path === '/debug/pprof/heap') {
        return heapHandler(req, res, next);
      }
      if (req.path === '/debug/pprof/profile') {
        return wallHandler(req, res, next);
      }
    }
    next();
  };
}
