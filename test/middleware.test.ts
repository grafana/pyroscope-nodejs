import Pyroscope from '../src/index.js';
import request from 'supertest';
import express from 'express';

// You only need appName for the pull mode
Pyroscope.init();

describe('express middleware', () => {
  afterAll(async () => {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // avoid jest open handle error
  });
  it('should be a function', () => {
    expect(typeof Pyroscope.expressMiddleware).toBe('function');
  });
  it('should respond to cpu calls', async () => {
    const app = express();
    app.use(Pyroscope.expressMiddleware());
    return request(app)
      .get('/debug/pprof/profile?seconds=1')
      .then((result) => {
        expect(result.statusCode).toBe(200);
      })
      .catch((result) => {
        expect(result.statusCode).toBe(200);
      });
  });
  it('should respond to repetitive cpu calls', async () => {
    const app = express();
    app.use(Pyroscope.expressMiddleware());
    return request(app)
      .get('/debug/pprof/profile?seconds=1')
      .then((result) => {
        expect(result.statusCode).toBe(200);
      })
      .catch((result) => {
        expect(result.statusCode).toBe(200);
      });
  });

  // it('should respond to simultaneous cpu calls', () => {
  //   const app = express()
  //   app.use(Pyroscope.expressMiddleware())
  //   console.log('0', Date.now()/1000);
  //   return Promise.all([
  //     request(app)
  //       .get('/debug/pprof/profile?seconds=1')
  //       .then((result) => {
  //         expect(result.statusCode).toBe(200)
  //       })
  //       .catch((result) => {
  //         expect(result.statusCode).toBe(200)
  //       }),
  //     request(app)
  //       .get('/debug/pprof/profile?seconds=1')
  //       .then((result) => {
  //         expect(result.statusCode).toBe(200)
  //       })
  //       .catch((result) => {
  //         expect(result.statusCode).toBe(200)
  //       }),
  //   ])
  // })
  it('should respond to heap profiling calls', () => {
    const app = express();
    app.use(Pyroscope.expressMiddleware());
    return request(app)
      .get('/debug/pprof/heap')
      .then((result) => expect(result.statusCode).toBe(200))
      .catch((result) => {
        expect(result.statusCode).toBe(200);
      });
  });
  it('should respond to repetitive heap profiling calls', () => {
    const app = express();
    app.use(Pyroscope.expressMiddleware());
    return request(app)
      .get('/debug/pprof/heap')
      .then((result) => expect(result.statusCode).toBe(200))
      .catch((result) => {
        expect(result.statusCode).toBe(200);
      });
  });

  it('should respond to simultaneous heap profiling calls', () => {
    const app = express();
    app.use(Pyroscope.expressMiddleware());
    return Promise.all([
      request(app)
        .get('/debug/pprof/heap?seconds=1')
        .then((result) => expect(result.statusCode).toBe(200))
        .catch((result) => {
          expect(result.statusCode).toBe(200);
        }),
      request(app)
        .get('/debug/pprof/heap?seconds=1')
        .then((result) => expect(result.statusCode).toBe(200))
        .catch((result) => {
          expect(result.statusCode).toBe(200);
        }),
    ]);
  });

  it('should be fine using two middlewares at the same time', () => {
    const app = express();
    app.use(Pyroscope.expressMiddleware());

    const app2 = express();
    app2.use(Pyroscope.expressMiddleware());

    request(app)
      .get('/debug/pprof/heap')
      .then((result) => expect(result.statusCode).toBe(200))
      .catch((result) => {
        expect(result.statusCode).toBe(200);
      });

    request(app2)
      .get('/debug/pprof/heap')
      .then((result) => expect(result.statusCode).toBe(200))
      .catch((result) => {
        expect(result.statusCode).toBe(200);
      });
  });
});
