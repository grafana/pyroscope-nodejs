import { strict as assert } from 'node:assert';
import { createServer, type Server } from 'node:http';
import { describe, it } from 'node:test';

import express from 'express';
import Pyroscope from '../src/index.js';

// You only need appName for the pull mode
Pyroscope.init();

type ExpressApp = ReturnType<typeof express>;

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return `http://127.0.0.1:${address.port}`;
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

async function withServer(
  app: ExpressApp,
  fn: (baseUrl: string) => Promise<void>
): Promise<void> {
  const server = createServer(app);
  const baseUrl = await listen(server);

  try {
    await fn(baseUrl);
  } finally {
    await close(server);
  }
}

async function fetchStatus(baseUrl: string, path: string): Promise<number> {
  const response = await fetch(new URL(path, baseUrl));
  await response.arrayBuffer();
  return response.status;
}

function appWithMiddleware(): ExpressApp {
  const app = express();
  app.use(Pyroscope.expressMiddleware());
  return app;
}

describe('express middleware', () => {
  it('should be a function', () => {
    assert.strictEqual(typeof Pyroscope.expressMiddleware, 'function');
  });

  it('should respond to cpu calls', async () => {
    await withServer(appWithMiddleware(), async (baseUrl) => {
      assert.strictEqual(
        await fetchStatus(baseUrl, '/debug/pprof/profile?seconds=1'),
        200
      );
    });
  });

  it('should respond to repetitive cpu calls', async () => {
    await withServer(appWithMiddleware(), async (baseUrl) => {
      assert.strictEqual(
        await fetchStatus(baseUrl, '/debug/pprof/profile?seconds=1'),
        200
      );
    });
  });

  it('should respond to heap profiling calls', async () => {
    await withServer(appWithMiddleware(), async (baseUrl) => {
      assert.strictEqual(await fetchStatus(baseUrl, '/debug/pprof/heap'), 200);
    });
  });

  it('should respond to repetitive heap profiling calls', async () => {
    await withServer(appWithMiddleware(), async (baseUrl) => {
      assert.strictEqual(await fetchStatus(baseUrl, '/debug/pprof/heap'), 200);
    });
  });

  it('should respond to simultaneous heap profiling calls', async () => {
    await withServer(appWithMiddleware(), async (baseUrl) => {
      const [response1, response2] = await Promise.all([
        fetchStatus(baseUrl, '/debug/pprof/heap?seconds=1'),
        fetchStatus(baseUrl, '/debug/pprof/heap?seconds=1'),
      ]);

      assert.strictEqual(response1, 200);
      assert.strictEqual(response2, 200);
    });
  });

  it('should be fine using two middlewares at the same time', async () => {
    await Promise.all([
      withServer(appWithMiddleware(), async (baseUrl) => {
        assert.strictEqual(await fetchStatus(baseUrl, '/debug/pprof/heap'), 200);
      }),
      withServer(appWithMiddleware(), async (baseUrl) => {
        assert.strictEqual(await fetchStatus(baseUrl, '/debug/pprof/heap'), 200);
      }),
    ]);
  });
});
