import Pyroscope from '../src';
import express from 'express';
import busboy from 'busboy';
import { Profile } from 'pprof-format';
import zlib from 'zlib';

type Numeric = number | bigint;

const extractProfile = (
  req: express.Request,
  res: express.Response,
  callback: (p: Profile, name: string) => void
) => {
  const bb = busboy({ headers: req.headers });
  bb.on('file', (name, file) => {
    file
      .toArray()
      .then((values) =>
        callback(Profile.decode(zlib.gunzipSync(values[0])), name)
      );
  });
  bb.on('close', () => {
    res.send('ok');
  });
  req.pipe(bb);
};

const doWork = (d: number): void => {
  const time = +new Date() + d * 1000;
  let i = 0;
  while (+new Date() < time) {
    i = i + Math.random();
  }
};

describe('common behaviour of profilers', () => {
  it('should call a server on startCpuProfiling and clear gracefully', (done) => {
    Pyroscope.init({
      serverAddress: 'http://localhost:4445',
      appName: 'nodejs',
      flushIntervalMs: 100,
      wall: {
        samplingDurationMs: 1000,
      },
    });
    const app = express();
    const server = app.listen(4445, () => {
      Pyroscope.startWallProfiling();
    });

    let closeInvoked = false;

    app.post('/ingest', (req, res) => {
      expect(req.query['spyName']).toEqual('nodespy');
      expect(req.query['name']).toEqual('nodejs{}');
      res.send('ok');
      if (!closeInvoked) {
        closeInvoked = true;
        (async () => {
          await Pyroscope.stopWallProfiling();
          server.close(() => {
            done();
          });
        })();
      }
    });
  });

  it('should call a server on startHeapProfiling and clear gracefully', (done) => {
    // Simulate memory usage
    const timer: NodeJS.Timeout = setInterval(() => {
      // Use some memory
      new Array<number>(2000)
        .fill(3)
        .reduce(
          (previous: number, current: number): number => previous + current,
          0
        );
    }, 100);

    Pyroscope.init({
      serverAddress: 'http://localhost:4444',
      appName: 'nodejs',
      flushIntervalMs: 100,
      tags: { env: 'test env' },
      heap: {
        samplingIntervalBytes: 1024,
      },
      wall: {
        samplingDurationMs: 1000,
      },
    });
    const app = express();
    const server = app.listen(4444, () => {
      Pyroscope.startHeapProfiling();
    });

    let closeInvoked = false;

    app.post('/ingest', (req, res) => {
      expect(req.query['spyName']).toEqual('nodespy');
      expect(req.query['name']).toEqual('nodejs{env=test env}');
      res.send('ok');
      if (!closeInvoked) {
        closeInvoked = true;
        (async () => {
          await Pyroscope.stopHeapProfiling();
          clearInterval(timer);
          server.close(() => {
            done();
          });
        })();
      }
    });
  });

  it('should allow to call start profiling twice', (done) => {
    // Simulate memory usage
    const timer: NodeJS.Timeout = setInterval(() => {
      // Use some memory
      new Array<number>(2000)
        .fill(3)
        .reduce(
          (previous: number, current: number): number => previous + current,
          0
        );
    }, 100);

    Pyroscope.init({
      serverAddress: 'http://localhost:4444',
      appName: 'nodejs',
      flushIntervalMs: 100,
      heap: {
        samplingIntervalBytes: 1000,
      },
      wall: {
        samplingDurationMs: 1000,
      },
    });
    Pyroscope.startHeapProfiling();
    Pyroscope.startHeapProfiling();
    (async () => {
      await Pyroscope.stopHeapProfiling();
      await Pyroscope.stopHeapProfiling();
      // And stop it without starting CPU
      await Pyroscope.stop();

      clearInterval(timer);

      done();
    })();
  });

  it('should have dynamic labels on wall profile', (done) => {
    Pyroscope.init({
      serverAddress: 'http://localhost:4446',
      appName: 'nodejs',
      flushIntervalMs: 100,
      heap: {
        samplingIntervalBytes: 1000,
      },
      wall: {
        samplingDurationMs: 1000,
        samplingIntervalMicros: 100,
      },
    });
    const app = express();
    const server = app.listen(4446, () => {
      Pyroscope.startWallProfiling();
      Pyroscope.wrapWithLabels(
        {
          vehicle: 'car',
        },
        () => {
          doWork(0.2);
          Pyroscope.wrapWithLabels(
            {
              brand: 'mercedes',
            },
            () => {
              doWork(0.2);
            }
          );
        }
      );
    });
    let closeInvoked = false;
    const valuesPerLabel = new Map<string, Array<number>>();

    app.post('/ingest', (req, res) => {
      expect(req.query['spyName']).toEqual('nodespy');
      expect(req.query['name']).toEqual('nodejs{}');
      extractProfile(req, res, (p: Profile) => {
        const s = (idx: Numeric): string => p.stringTable.strings[Number(idx)];

        // aggregate per labels
        p.sample.forEach((x) => {
          const key: string = JSON.stringify(
            x.label.reduce(
              (result, current) => ({
                ...result,
                [s(current.key)]: s(current.str),
              }),
              {}
            )
          );
          const prev = valuesPerLabel.get(key) ?? [0, 0, 0];
          valuesPerLabel.set(
            key,
            x.value.map((a, i) => Number(a) + prev[i])
          );
        });
      });

      if (!closeInvoked) {
        closeInvoked = true;
        (async () => {
          await Pyroscope.stopWallProfiling();
          server.close(() => {
            // ensure we contain everything expected
            const emptyLabels = JSON.stringify({});
            const vehicleOnly = JSON.stringify({ vehicle: 'car' });
            const vehicleAndBrand = JSON.stringify({
              vehicle: 'car',
              brand: 'mercedes',
            });

            expect(valuesPerLabel.keys()).toContain(emptyLabels);
            expect(valuesPerLabel.keys()).toContain(vehicleOnly);
            expect(valuesPerLabel.keys()).toContain(vehicleAndBrand);

            const valuesVehicleOnly = valuesPerLabel.get(vehicleOnly) ?? [0, 0];
            const valuesVehicleAndBrand = valuesPerLabel.get(
              vehicleAndBrand
            ) ?? [0, 0];

            // ensure the wall time is within a 20% range of each other
            const ratio = valuesVehicleOnly[1] / valuesVehicleAndBrand[1];
            expect(ratio).toBeGreaterThan(0.8);
            expect(ratio).toBeLessThan(1.2);

            done();
          });
        })();
      }
    });
  });

  it('should have extra samples for cpu time when enabled on wall profile', (done) => {
    Pyroscope.init({
      serverAddress: 'http://localhost:4447',
      appName: 'nodejs',
      flushIntervalMs: 100,
      heap: {
        samplingIntervalBytes: 1000,
      },
      wall: {
        samplingDurationMs: 1000,
        samplingIntervalMicros: 100,
        collectCpuTime: true,
      },
    });
    const app = express();
    const server = app.listen(4447, () => {
      Pyroscope.startWallProfiling();
    });

    let closeInvoked = false;
    app.post('/ingest', (req, res) => {
      expect(req.query['spyName']).toEqual('nodespy');
      expect(req.query['name']).toEqual('nodejs{}');

      extractProfile(req, res, (p: Profile) => {
        const s = (idx: number | bigint) => p.stringTable.strings[Number(idx)];
        // expect sample, wall and cpu types
        expect(p.sampleType.map((x) => `${s(x.type)}=${s(x.unit)}`)).toEqual([
          'samples=count',
          'wall=nanoseconds',
          'cpu=nanoseconds',
        ]);
      });

      if (!closeInvoked) {
        closeInvoked = true;
        (async () => {
          await Pyroscope.stopWallProfiling();
          server.close(() => {
            done();
          });
        })();
      }
    });
  });
});
