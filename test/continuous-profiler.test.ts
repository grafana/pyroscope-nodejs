import {describe, expect, it, vi} from 'vitest';

import {ProfileExport} from '../src/profile-exporter.js';
import {ContinuousProfiler} from '../src/profilers/continuous-profiler.js';
import {Profiler} from '../src/profilers/profiler.js';

describe('ContinuousProfiler', () => {
  it('keeps running when a profiling round throws', async () => {
    const exporter = {
      export: vi.fn(async (_profileExport: ProfileExport) => {}),
    };

    const profiler: Profiler<void> = {
      getLabels: () => ({}),
      setLabels: () => {},
      wrapWithLabels: (_labels, fn) => fn(),
      start: () => {},
      stop: () => null,
      profile: () => {
        throw new Error('transient profiling error');
      },
    };

    const continuousProfiler = new ContinuousProfiler<void>({
      exporter,
      flushIntervalMs: 5,
      profiler,
      startArgs: undefined,
    });

    continuousProfiler.start();
    await new Promise(resolve => setTimeout(resolve, 30));
    await expect(continuousProfiler.stop()).resolves.toBeUndefined();
    expect(exporter.export).not.toHaveBeenCalled();
  });
});
