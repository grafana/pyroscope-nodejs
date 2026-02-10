import { describe, it, expect, onTestFinished } from 'vitest';

import Pyroscope from '../src/index.js';
import express from 'express';
import busboy from 'busboy';
import { Profile } from 'pprof-format';
import zlib from 'zlib';

// createBackend creates an Express server with an /ingest endpoint and returns a promise
// that resolves to the HTTP port the server is listening on
const createBackend = (handler: express.RequestHandler): Promise<number> => {
  const server = express();
  const port = new Promise<number>((resolvePort, rejectPort) => {
    const httpServer = server.listen(0, () => {
      const address = httpServer.address();
      if (address && typeof address === 'object') {
        resolvePort(address.port);
      } else {
        rejectPort('Could not resolve port');
      }
    });
    onTestFinished(() => {
      httpServer.close();
    });
  });
  server.post('/ingest', handler);
  return port;
};
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
  it('should call a server on startCpuProfiling and clear gracefully', async () => {
    const firstRequest = new Promise<express.Request>((resolve) => {
      const port = createBackend(
        (req: express.Request, res: express.Response) => {
          resolve(req);
          res.send('ok');
        }
      );

      port.then((p: number) => {
        Pyroscope.init({
          serverAddress: `http://localhost:${p}`,
          appName: 'nodejs',
          flushIntervalMs: 100,
          wall: {
            samplingDurationMs: 1000,
          },
        });
        Pyroscope.startWallProfiling();
        doWork(0.1);
      });
    });

    const req = await firstRequest;
    await Pyroscope.stopWallProfiling();
    expect(req.query.spyName).toBe('nodespy');
    expect(req.query.name).toBe('nodejs{}');
  });

  it('should set wall sampleRate from samplingIntervalMicros', async () => {
    const firstRequest = new Promise<express.Request>((resolve) => {
      const port = createBackend(
        (req: express.Request, res: express.Response) => {
          resolve(req);
          res.send('ok');
        }
      );

      port.then((p: number) => {
        Pyroscope.init({
          serverAddress: `http://localhost:${p}`,
          appName: 'nodejs',
          flushIntervalMs: 100,
          wall: {
            samplingDurationMs: 1000,
            samplingIntervalMicros: 10000,
          },
        });
        Pyroscope.startWallProfiling();
        doWork(0.1);
      });
    });

    const req = await firstRequest;
    await Pyroscope.stopWallProfiling();
    expect(req.query.sampleRate).toBe('100');
  });

  it('should call a server on startHeapProfiling and clear gracefully', async () => {
    const firstRequest = new Promise<express.Request>((resolve) => {
      const port = createBackend(
        (req: express.Request, res: express.Response) => {
          resolve(req);
          res.send('ok');
        }
      );

      port.then((p: number) => {
        Pyroscope.init({
          serverAddress: `http://localhost:${p}`,
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
        Pyroscope.startHeapProfiling();

        // Simulate memory usage
        setInterval(() => {
          // Use some memory
          new Array<number>(2000)
            .fill(3)
            .reduce(
              (previous: number, current: number): number => previous + current,
              0
            );
        }, 100);
      });
    });

    const req = await firstRequest;
    await Pyroscope.stopHeapProfiling();
    expect(req.query['spyName']).toBe('nodespy');
    expect(req.query['name']).toBe('nodejs{env=test env}');
  });

  it('should allow to call start profiling twice', async () => {
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

    await Pyroscope.stopHeapProfiling();
    await Pyroscope.stopHeapProfiling();
    // And stop it without starting CPU
    await Pyroscope.stop();

    clearInterval(timer);
  });

  it('should have dynamic labels on wall profile', async () => {
    const valuesPerLabel = new Map<string, Array<number>>();
    const firstRequest = new Promise<express.Request>((resolve) => {
      const port = createBackend(
        (req: express.Request, res: express.Response) => {
          extractProfile(req, res, (p: Profile) => {
            const s = (idx: Numeric): string =>
              p.stringTable.strings[Number(idx)];

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
          resolve(req);
        }
      );

      port.then((p: number) => {
        Pyroscope.init({
          serverAddress: `http://localhost:${p}`,
          appName: 'nodejs',
          flushIntervalMs: 100,
          heap: {
            samplingIntervalBytes: 1000,
          },
          wall: {
            samplingDurationMs: 1000,
            samplingIntervalMicros: 1000,
          },
        });
        Pyroscope.startWallProfiling();
        Pyroscope.wrapWithLabels(
          {
            vehicle: 'car',
          },
          () => {
            doWork(0.1);
            Pyroscope.wrapWithLabels(
              {
                brand: 'mercedes',
              },
              () => {
                doWork(0.1);
              }
            );
          }
        );
      });
    });

    const req = await firstRequest;
    await Pyroscope.stopWallProfiling();

    expect(req.query['spyName']).toEqual('nodespy');
    expect(req.query['name']).toEqual('nodejs{}');

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
    const valuesVehicleAndBrand = valuesPerLabel.get(vehicleAndBrand) ?? [0, 0];

    // ensure the wall time is within a 20% range of each other
    const ratio = valuesVehicleOnly[1] / valuesVehicleAndBrand[1];
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(1.2);
  });

  it('should have extra samples for cpu time when enabled on wall profile', async () => {
    let sampleType: string[] = [];
    const firstRequest = new Promise<express.Request>((resolve) => {
      const port = createBackend(
        (req: express.Request, res: express.Response) => {
          extractProfile(req, res, (p: Profile) => {
            const s = (idx: number | bigint) =>
              p.stringTable.strings[Number(idx)];
            sampleType = p.sampleType.map((x) => `${s(x.type)}=${s(x.unit)}`);
          });
          resolve(req);
        }
      );
      port.then((p: number) => {
        Pyroscope.init({
          serverAddress: `http://localhost:${p}`,
          appName: 'nodejs',
          flushIntervalMs: 100,
          heap: {
            samplingIntervalBytes: 1000,
          },
          wall: {
            samplingDurationMs: 1000,
            samplingIntervalMicros: 1000,
            collectCpuTime: true,
          },
        });
        Pyroscope.startWallProfiling();
        doWork(0.1);
      });
    });

    const req = await firstRequest;
    await Pyroscope.stopWallProfiling();

    expect(req.query['spyName']).toEqual('nodespy');
    expect(req.query['name']).toEqual('nodejs{}');
    // expect sample, wall and cpu types
    expect(sampleType).toEqual([
      'samples=count',
      'wall=nanoseconds',
      'cpu=nanoseconds',
    ]);
  });

  it('should send bearer authentication header when configured', async () => {
    const firstRequest = new Promise<express.Request>((resolve) => {
      const port = createBackend(
        (req: express.Request, res: express.Response) => {
          resolve(req);
          res.send('ok');
        }
      );

      port.then((p: number) => {
        Pyroscope.init({
          serverAddress: `http://localhost:${p}`,
          appName: 'nodejs',
          flushIntervalMs: 100,
          wall: {
            samplingDurationMs: 1000,
          },
          authToken: 'my-token',
        });
        Pyroscope.startWallProfiling();
        doWork(0.01);
      });
    });

    const req = await firstRequest;
    await Pyroscope.stopWallProfiling();
    expect(req.headers['authorization']).toBe('Bearer my-token');
  });

  it('should send basic authentication header when configured', async () => {
    const firstRequest = new Promise<express.Request>((resolve) => {
      const port = createBackend(
        (req: express.Request, res: express.Response) => {
          resolve(req);
          res.send('ok');
        }
      );

      port.then((p: number) => {
        Pyroscope.init({
          serverAddress: `http://localhost:${p}`,
          appName: 'nodejs',
          flushIntervalMs: 100,
          wall: {
            samplingDurationMs: 1000,
          },
          basicAuthUser: 'user',
          basicAuthPassword: 'password',
        });
        Pyroscope.startWallProfiling();
        doWork(0.01);
      });
    });

    const req = await firstRequest;
    await Pyroscope.stopWallProfiling();
    expect(req.headers['authorization']).toBe('Basic dXNlcjpwYXNzd29yZA==');
  });

  it('should send x-scope-orgid header when configured', async () => {
    const firstRequest = new Promise<express.Request>((resolve) => {
      const port = createBackend(
        (req: express.Request, res: express.Response) => {
          resolve(req);
          res.send('ok');
        }
      );

      port.then((p: number) => {
        Pyroscope.init({
          serverAddress: `http://localhost:${p}`,
          appName: 'nodejs',
          flushIntervalMs: 100,
          wall: {
            samplingDurationMs: 1000,
          },
          tenantID: 'my-tenant-id',
        });
        Pyroscope.startWallProfiling();
        doWork(0.01);
      });
    });

    const req = await firstRequest;
    await Pyroscope.stopWallProfiling();
    expect(req.headers['x-scope-orgid']).toBe('my-tenant-id');
  });
});
