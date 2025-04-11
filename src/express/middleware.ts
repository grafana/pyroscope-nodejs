import debug from 'debug';
import { NextFunction, Request, Response, RequestHandler } from 'express';
import { collectHeap, collectWall } from '../utils/middleware-collectors';

const log = debug('pyroscope');

function profileExpressHandler(
  profileKind: string,
  useCaseHandler: (req: Request) => Promise<Buffer>
): RequestHandler {
  return async (
    req: Request,
    res: Response
    // next: NextFunction
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

const heapHandler: RequestHandler = profileExpressHandler('Heap', () =>
  collectHeap()
);

const wallHandler: RequestHandler = profileExpressHandler(
  'Wall',
  (req: Request) => collectWall(1000 * Number(req.query.seconds))
);

export default function expressMiddleware(): (
  req: Request,
  res: Response,
  next: NextFunction
) => void {
  return (req: Request, res: Response, next: NextFunction) => {
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
