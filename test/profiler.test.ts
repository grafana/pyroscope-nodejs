import Pyroscope from '../src'
import express from 'express'

describe('common behaviour of profilers', () => {
  it('should call a server on startCpuProfiling and clear gracefully', (done) => {
    Pyroscope.init({
      serverAddress: 'http://localhost:4445',
      appName: 'nodejs',
      flushIntervalMs: 100,
      wall: {
        samplingDurationMs: 1000,
      },
    })
    const app = express()
    const server = app.listen(4445, () => {
      Pyroscope.startWallProfiling()
    })

    let closeInvoked = false

    app.post('/ingest', (req, res) => {
      expect(req.query['spyName']).toEqual('nodespy')
      expect(req.query['name']).toEqual('nodejs{}')
      res.send('ok')
      if (!closeInvoked) {
        closeInvoked = true
        ;(async () => {
          await Pyroscope.stopWallProfiling()
          server.close(() => {
            done()
          })
        })()
      }
    })
  })

  it('should call a server on startHeapProfiling and clear gracefully', (done) => {
    // Simulate memory usage
    const timer: NodeJS.Timeout = setInterval(() => {
      // Use some memory
      new Array<number>(2000)
        .fill(3)
        .reduce(
          (previous: number, current: number): number => previous + current,
          0
        )
    }, 100)

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
    })
    const app = express()
    const server = app.listen(4444, () => {
      Pyroscope.startHeapProfiling()
    })

    let closeInvoked = false

    app.post('/ingest', (req, res) => {
      expect(req.query['spyName']).toEqual('nodespy')
      expect(req.query['name']).toEqual('nodejs{env=test env}')
      res.send('ok')
      if (!closeInvoked) {
        closeInvoked = true
        ;(async () => {
          await Pyroscope.stopHeapProfiling()
          clearInterval(timer)
          server.close(() => {
            done()
          })
        })()
      }
    })
  })

  it('should allow to call start profiling twice', (done) => {
    // Simulate memory usage
    const timer: NodeJS.Timeout = setInterval(() => {
      // Use some memory
      new Array<number>(2000)
        .fill(3)
        .reduce(
          (previous: number, current: number): number => previous + current,
          0
        )
    }, 100)

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
    })
    Pyroscope.startHeapProfiling()
    Pyroscope.startHeapProfiling()
    ;(async () => {
      await Pyroscope.stopHeapProfiling()
      await Pyroscope.stopHeapProfiling()
      // And stop it without starting CPU
      await Pyroscope.stop()

      clearInterval(timer)

      done()
    })()
  })

  it('should have labels on cpu profile', (done) => {
    Pyroscope.init({
      serverAddress: 'http://localhost:4445',
      appName: 'nodejs',
      flushIntervalMs: 100,
      heap: {
        samplingIntervalBytes: 1000,
      },
      wall: {
        samplingDurationMs: 1000,
      },
    })
    Pyroscope.setWallLabels({
      vehicle: 'car',
    })
    const app = express()
    const server = app.listen(4445, () => {
      Pyroscope.startWallProfiling()
    })

    let closeInvoked = false

    app.post('/ingest', (req, res) => {
      expect(req.query['spyName']).toEqual('nodespy')
      expect(req.query['name']).toEqual('nodejs{}')
      res.send('ok')
      if (!closeInvoked) {
        closeInvoked = true
        ;(async () => {
          await Pyroscope.stopWallProfiling()
          server.close(() => {
            done()
          })
        })()
      }
    })
  })
})
