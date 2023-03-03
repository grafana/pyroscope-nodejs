import Pyroscope from '@pyroscope/nodejs'
import express from 'express'

jest.setTimeout(150000)

describe('common behaviour of profilers', () => {

  it('should require server name and app name as options', (done) => {
    Pyroscope.init({})
    expect(Pyroscope.start).toThrowError("Please set the server address in the init()");

    Pyroscope.init({appName: "nodejs"});
    expect(Pyroscope.start).toThrowError("Please set the server address in the init()");

    done();
  })

  it('should call a server on startCpuProfiling and clear gracefully', (done) => {
    Pyroscope.init({serverAddress: "http://localhost:4445", appName: "nodejs"})
    const app = express();
    const server = app.listen(4445, () => {
      Pyroscope.startWallProfiling()
    });
    let call = 0
    app.post('/ingest', (req, res) => {
      expect(req.query['spyName']).toEqual('nodespy');
      expect(req.query['name']).toEqual('nodejs{}');
      res.send("ok");
      if (++call == 1) {
        (async () => {
          await Pyroscope.stopWallProfiling()
          server.close(() => {
            expect(call).toEqual(2)
            done()
          });
        })();
      }

    });
  });

  it('should call a server on startHeapProfiling and clear gracefully', (done) => {
    Pyroscope.init({serverAddress: "http://localhost:4444", appName: "nodejs", tags: {env: "test env"}})
    const app = express();
    const server = app.listen(4444, () => {
      Pyroscope.startHeapProfiling()
    });
    let call = 0
    app.post('/ingest', (req, res) => {
      expect(req.query['spyName']).toEqual('nodespy');
      expect(req.query['name']).toEqual('nodejs{env=test env}');
      res.send("ok");
      if (++call == 1) {
        (async () => {
          await Pyroscope.stopHeapProfiling()
          server.close(() => {
            expect(call).toEqual(2)
            done()
          });
        })();
      }
    });
  });

  it('should allow to call start profiling twice', (done) => {
    Pyroscope.init({serverAddress: "http://localhost:4444", appName: "nodejs"})
    Pyroscope.startHeapProfiling();
    Pyroscope.startHeapProfiling();
    (async () => {
      await Pyroscope.stopHeapProfiling();
      await Pyroscope.stopHeapProfiling();
      // And stop it without starting CPU
      await Pyroscope.stop();
      done()
    })()
  })

  it('should allow to start cpu and wall profiling at the same time', (done) => {
    Pyroscope.init({
      serverAddress: 'http://localhost:4444',
      appName: 'nodejs',
    })
    Pyroscope.startCpuProfiling()
    Pyroscope.startWallProfiling()

    setImmediate(async () => {
      await Pyroscope.stopWallProfiling()
      await Pyroscope.stopCpuProfiling()
      done()
    })
  })

  it('should have labels on cpu profile', (done) => {
    Pyroscope.init({
      serverAddress: 'http://localhost:4444',
      appName: 'nodejs',
    })
    let a = 0
    Pyroscope.emitter.once('profile', (profile) => {
      expect(profile.stringTable.strings).toContain('thisIsAnUniqueTag')
      expect(profile.stringTable.strings).toContain('label')
      setImmediate(async () => {
        await Pyroscope.stopCpuProfiling()
        setTimeout(done, 10)
      })
    })
    Pyroscope.startCpuProfiling()
    Pyroscope.tagWrapper(
      { label: 'thisIsAnUniqueTag' },
      function basicFunction() {
        const time = +new Date() + 9 * 1000
        let i = 0
        while (+new Date() < time) {
          i = i + Math.random()
        }
        a = a + i
      }
    )
  })

});
