import debug from 'debug';
import type {
  FastifyRequest,
  FastifyReply,
  FastifyPluginCallback,
} from 'fastify';
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

async function heapHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  log('Fetching Heap Profile');
  try {
    const profileBuffer = await collectHeap();
    reply.status(200).type('application/octet-stream').send(profileBuffer);
  } catch (error: unknown) {
    log('Error collecting Heap', error);
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

async function wallHandler(
  request: FastifyRequest<{ Querystring: { seconds?: string } }>,
  reply: FastifyReply
): Promise<void> {
  log('Fetching Wall Profile');
  try {
    const seconds = Number(request.query.seconds || 1);
    const profileBuffer = await collectWall(1000 * seconds);
    reply.status(200).type('application/octet-stream').send(profileBuffer);
  } catch (error: unknown) {
    log('Error collecting Wall', error);
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}

const fastifyMiddleware = (): FastifyPluginCallback => {
  const plugin: FastifyPluginCallback = (fastify, _options, done) => {
    // Register route for heap profiling
    fastify.get('/debug/pprof/heap', heapHandler);

    // Register route for wall/CPU profiling
    fastify.get('/debug/pprof/profile', wallHandler);

    done();
  };
  return plugin;
};

export default fastifyMiddleware;
