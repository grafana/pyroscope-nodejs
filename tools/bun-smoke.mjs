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

async function waitFor(condition, timeoutMs, intervalMs = 50) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error('Timed out waiting for condition');
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
  const ingestRequests = [];

  const app = express();
  app.post(
    '/ingest',
    express.raw({
      type: () => true,
      limit: '10mb',
    }),
    (req, res) => {
      ingestRequests.push({
        bodyLength: Buffer.isBuffer(req.body) ? req.body.length : 0,
        contentType: req.headers['content-type'],
        query: req.query,
      });
      res.status(204).end();
    }
  );
  app.use(Pyroscope.expressMiddleware());
  const server = await listen(app);

  try {
    const address = server.address();
    assert(address && typeof address === 'object', 'Failed to resolve listen address');

    const baseUrl = `http://127.0.0.1:${address.port}`;
    // Validate the flow where continuous profiling is already active and
    // pull endpoints are invoked from middleware.
    Pyroscope.init({
      appName: 'pyroscope-nodejs-bun-smoke',
      serverAddress: baseUrl,
      flushIntervalMs: 250,
      tags: {
        runtime: 'bun',
        suite: 'smoke',
      },
    });
    Pyroscope.start();

    const [heap, wall] = await Promise.all([
      profileEndpoint(baseUrl, '/debug/pprof/heap'),
      profileEndpoint(baseUrl, '/debug/pprof/profile?seconds=1'),
    ]);

    assert(heap.status === 200, `Heap endpoint returned ${heap.status}`);
    assert(heap.bytes > 0, 'Heap endpoint returned an empty profile payload');
    assert(wall.status === 200, `Wall endpoint returned ${wall.status}`);
    assert(wall.bytes > 0, 'Wall endpoint returned an empty profile payload');
    await waitFor(() => ingestRequests.length > 0, 5000);
    const ingest = ingestRequests[0];
    assert(ingest.bodyLength > 0, 'Ingest endpoint received an empty body');
    assert(
      typeof ingest.contentType === 'string' &&
        ingest.contentType.startsWith('multipart/form-data'),
      'Ingest endpoint did not receive multipart form data'
    );
    assert(typeof ingest.query.from === 'string', 'Ingest query missing from');
    assert(typeof ingest.query.until === 'string', 'Ingest query missing until');
    assert(typeof ingest.query.name === 'string', 'Ingest query missing name');
    assert(typeof ingest.query.spyName === 'string', 'Ingest query missing spyName');

    console.log(
      JSON.stringify({
        ok: true,
        heapBytes: heap.bytes,
        wallBytes: wall.bytes,
        ingestRequests: ingestRequests.length,
      })
    );
  } finally {
    await close(server);
    await Pyroscope.stop();
  }
}

await run();
