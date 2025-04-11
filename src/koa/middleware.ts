import debug from 'debug';
import { Context, Middleware } from 'koa';
import { collectHeap, collectWall } from '../utils/middleware-collectors';

const log = debug('pyroscope');

function profileKoaHandler(
  profileKind: string,
  useCaseHandler: (ctx: Context) => Promise<Buffer>
): Middleware {
  return async (ctx: Context): Promise<void> => {
    log(`Fetching ${profileKind} Profile`);
    try {
      const profileBuffer = await useCaseHandler(ctx);
      ctx.status = 200;
      ctx.body = profileBuffer;
    } catch (error: unknown) {
      log(`Error collecting ${profileKind}`, error);
      ctx.status = 500;
    }
  };
}

const heapHandler: Middleware = profileKoaHandler('Heap', () => collectHeap());

const wallHandler: Middleware = profileKoaHandler('Wall', (ctx: Context) =>
  collectWall(1000 * Number(ctx.query.seconds))
);

export default function koaMiddleware(): Middleware {
  return async (ctx: Context, next: () => Promise<void>) => {
    if (ctx.method === 'GET') {
      if (ctx.path === '/debug/pprof/heap') {
        return heapHandler(ctx, next);
      }
      if (ctx.path === '/debug/pprof/profile') {
        return wallHandler(ctx, next);
      }
    }
    await next();
  };
}
