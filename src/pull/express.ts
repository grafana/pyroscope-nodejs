import Pyroscope, { PyroscopeConfig } from '../index'
import { Request, Response, NextFunction } from 'express'
import debug from 'debug'

const log = debug('pyroscope')

async function handlerCpu(req: Request, res: Response) {
  log('Collecting Cpu for', req.query.seconds)
  try {
    const p = await Pyroscope.collectCpu(Number(req.query.seconds))
    console.log(p)
    res.send(p)
  } catch (e) {
    console.error('Error collecting cpu', e)
    res.sendStatus(500)
  }
  res.end()
}

async function handlerHeap(req: Request, res: Response) {
  log('Collecting Heap for', req.query.seconds)
  try {
    const p = await Pyroscope.collectHeap()
    console.log(p)
    res.send(p)
  } catch (e) {
    console.error('Error collecting Heap', e)
    res.sendStatus(500)
  }
  res.end()
}

export default function expressMiddleware(
  options: PyroscopeConfig
): (req: Request, res: Response, next: NextFunction) => void {
  Pyroscope.init({ ...options, autoStart: false })
  Pyroscope.startHeapCollecting()

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && req.path === '/debug/pprof/profile') {
      return handlerCpu(req, res).then(() => next())
    }
    if (req.method === 'GET' && req.path === '/debug/pprof/heap') {
      return handlerHeap(req, res).then(() => next())
    }
    next()
  }
}
