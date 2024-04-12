import debug from 'debug'
import { NextFunction, Request, Response, RequestHandler } from 'express'
import { Profile } from 'pprof-format'
import { Profiler } from '../profilers/profiler'
import { PyroscopeProfiler } from '../profilers/pyroscope-profiler'
import { WallProfilerStartArgs } from '../profilers/wall-profiler'
import { getProfiler } from '../utils/pyroscope-profiler'
import { encode } from '@datadog/pprof'
import { HeapProfilerStartArgs } from '../profilers/heap-profiler'

const log = debug('pyroscope')

async function collectProfile<TStartArgs>(
  profiler: Profiler<TStartArgs>
): Promise<Buffer> {
  const profile: Profile = profiler.profile().profile

  profiler.stop()

  return encode(profile)
}

async function collectProfileAfterMs<TStartArgs>(
  profiler: Profiler<TStartArgs>,
  args: TStartArgs,
  delayMs: number
): Promise<Buffer> {
  profiler.start(args)

  if (delayMs === 0) {
    return collectProfile(profiler)
  }

  return new Promise(
    (resolve: (buffer: Buffer | PromiseLike<Buffer>) => void) => {
      setTimeout(() => {
        resolve(collectProfile(profiler))
      }, delayMs)
    }
  )
}

function collectHeap(): Promise<Buffer> {
  const profiler: PyroscopeProfiler = getProfiler()

  const heapProfilerArgs: HeapProfilerStartArgs =
    profiler.heapProfiler.startArgs
  const heapProfiler: Profiler<HeapProfilerStartArgs> =
    profiler.heapProfiler.profiler

  return collectProfileAfterMs(heapProfiler, heapProfilerArgs, 0)
}

function collectWall(ms: number): Promise<Buffer> {
  const profiler: PyroscopeProfiler = getProfiler()

  const wallProfilerArgs: WallProfilerStartArgs =
    profiler.wallProfiler.startArgs
  const wallProfiler: Profiler<WallProfilerStartArgs> =
    profiler.wallProfiler.profiler

  return collectProfileAfterMs(wallProfiler, wallProfilerArgs, ms)
}

function profileExpressHandler(
  profileKind: string,
  useCaseHandler: (req: Request) => Promise<Buffer>
): RequestHandler {
  return async (
    req: Request,
    res: Response
    // next: NextFunction
  ): Promise<void> => {
    log(`Fetching ${profileKind} Profile`)
    try {
      const profileBuffer = await useCaseHandler(req)
      res.status(200).send(profileBuffer)
    } catch (error: unknown) {
      log(`Error collecting ${profileKind}`, error)
      res.sendStatus(500)
    }
  }
}

const heapHandler: RequestHandler = profileExpressHandler('Heap', () =>
  collectHeap()
)

const wallHandler: RequestHandler = profileExpressHandler(
  'Wall',
  (req: Request) => collectWall(1000 * Number(req.query.seconds))
)

export default function expressMiddleware(): (
  req: Request,
  res: Response,
  next: NextFunction
) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET') {
      if (req.path === '/debug/pprof/heap') {
        return heapHandler(req, res, next)
      }
      if (req.path === '/debug/pprof/profile') {
        return wallHandler(req, res, next)
      }
    }
    next()
  }
}
