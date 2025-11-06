import { describe, it, expect } from 'vitest';

import Pyroscope from '../src/index.js';
import Fastify from 'fastify';

// You only need appName for the pull mode
Pyroscope.init();

describe('fastify middleware', () => {
  it('should be a function', () => {
    expect(typeof Pyroscope.fastifyMiddleware).toBe('function');
  });
  it('should respond to cpu calls', async () => {
    const app = Fastify();
    await app.register(Pyroscope.fastifyMiddleware());
    const response = await app.inject({
      method: 'GET',
      url: '/debug/pprof/profile?seconds=1'
    });
    expect(response.statusCode).toBe(200);
  });
  it('should respond to repetitive cpu calls', async () => {
    const app = Fastify();
    await app.register(Pyroscope.fastifyMiddleware());
    const response = await app.inject({
      method: 'GET',
      url: '/debug/pprof/profile?seconds=1'
    });
    expect(response.statusCode).toBe(200);
  });

  // it('should respond to simultaneous cpu calls', async () => {
  //   const app = Fastify()
  //   await app.register(Pyroscope.fastifyMiddleware())
  //   console.log('0', Date.now()/1000);
  //   const [response1, response2] = await Promise.all([
  //     app.inject({
  //       method: 'GET',
  //       url: '/debug/pprof/profile?seconds=1'
  //     }),
  //     app.inject({
  //       method: 'GET',
  //       url: '/debug/pprof/profile?seconds=1'
  //     }),
  //   ])
  //   expect(response1.statusCode).toBe(200)
  //   expect(response2.statusCode).toBe(200)
  // })
  it('should respond to heap profiling calls', async () => {
    const app = Fastify();
    await app.register(Pyroscope.fastifyMiddleware());
    const response = await app.inject({
      method: 'GET',
      url: '/debug/pprof/heap'
    });
    expect(response.statusCode).toBe(200);
  });
  it('should respond to repetitive heap profiling calls', async () => {
    const app = Fastify();
    await app.register(Pyroscope.fastifyMiddleware());
    const response = await app.inject({
      method: 'GET',
      url: '/debug/pprof/heap'
    });
    expect(response.statusCode).toBe(200);
  });

  it('should respond to simultaneous heap profiling calls', async () => {
    const app = Fastify();
    await app.register(Pyroscope.fastifyMiddleware());
    const [response1, response2] = await Promise.all([
      app.inject({
        method: 'GET',
        url: '/debug/pprof/heap?seconds=1'
      }),
      app.inject({
        method: 'GET',
        url: '/debug/pprof/heap?seconds=1'
      }),
    ]);
    expect(response1.statusCode).toBe(200);
    expect(response2.statusCode).toBe(200);
  });

  it('should be fine using two middlewares at the same time', async () => {
    const app = Fastify();
    await app.register(Pyroscope.fastifyMiddleware());

    const app2 = Fastify();
    await app2.register(Pyroscope.fastifyMiddleware());

    const response1 = await app.inject({
      method: 'GET',
      url: '/debug/pprof/heap'
    });
    expect(response1.statusCode).toBe(200);

    const response2 = await app2.inject({
      method: 'GET',
      url: '/debug/pprof/heap'
    });
    expect(response2.statusCode).toBe(200);
  });
});
