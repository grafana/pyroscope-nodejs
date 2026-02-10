#!/usr/bin/env bun

import express from 'express';
import Pyroscope from '../dist/esm/index.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function listen(app) {
  return await new Promise((resolve, reject) => {
    const server = app.listen(0, () => resolve(server));
    server.once('error', reject);
  });
}

async function close(server) {
  await new Promise((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

async function profileEndpoint(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);
  const buffer = await response.arrayBuffer();
  return {
    status: response.status,
    bytes: buffer.byteLength,
  };
}

async function run() {
  Pyroscope.init({
    appName: 'pyroscope-nodejs-bun-smoke',
    serverAddress: 'http://127.0.0.1:4040',
    tags: {
      runtime: 'bun',
      suite: 'smoke',
    },
  });

  // Validate the flow where continuous profiling is already active and
  // pull endpoints are invoked from middleware.
  Pyroscope.start();

  const app = express();
  app.use(Pyroscope.expressMiddleware());
  const server = await listen(app);

  try {
    const address = server.address();
    assert(address && typeof address === 'object', 'Failed to resolve listen address');

    const baseUrl = `http://127.0.0.1:${address.port}`;

    const [heap, wall] = await Promise.all([
      profileEndpoint(baseUrl, '/debug/pprof/heap'),
      profileEndpoint(baseUrl, '/debug/pprof/profile?seconds=1'),
    ]);

    assert(heap.status === 200, `Heap endpoint returned ${heap.status}`);
    assert(heap.bytes > 0, 'Heap endpoint returned an empty profile payload');
    assert(wall.status === 200, `Wall endpoint returned ${wall.status}`);
    assert(wall.bytes > 0, 'Wall endpoint returned an empty profile payload');

    console.log(
      JSON.stringify({
        ok: true,
        heapBytes: heap.bytes,
        wallBytes: wall.bytes,
      })
    );
  } finally {
    await close(server);
    await Pyroscope.stop();
  }
}

await run();
