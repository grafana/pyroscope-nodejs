import { Profile } from 'pprof-format';
import { Profiler } from '../profilers/profiler.js';
import { PyroscopeProfiler } from '../profilers/pyroscope-profiler.js';
import { WallProfilerStartArgs } from '../profilers/wall-profiler.js';
import { getProfiler } from '../utils/pyroscope-profiler.js';
import { encode } from '@datadog/pprof';
import { HeapProfilerStartArgs } from '../profilers/heap-profiler.js';

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

export function collectHeap(): Promise<Buffer> {
  const profiler: PyroscopeProfiler = getProfiler();

  const heapProfilerArgs: HeapProfilerStartArgs =
    profiler.heapProfiler.startArgs;
  const heapProfiler: Profiler<HeapProfilerStartArgs> =
    profiler.heapProfiler.profiler;

  return collectProfileAfterMs(heapProfiler, heapProfilerArgs, 0);
}

export function collectWall(ms: number): Promise<Buffer> {
  const profiler: PyroscopeProfiler = getProfiler();

  const wallProfilerArgs: WallProfilerStartArgs =
    profiler.wallProfiler.startArgs;
  const wallProfiler: Profiler<WallProfilerStartArgs> =
    profiler.wallProfiler.profiler;

  return collectProfileAfterMs(wallProfiler, wallProfilerArgs, ms);
}
