import Pyroscope from '../index.js'
import { Request, Response, NextFunction } from 'express'
import debug from 'debug'

const log = debug('pyroscope')

async function handlerCpu(req: Request, res: Response) {
  log('Collecting Cpu for', req.query.seconds)
  try {
    const p = await Pyroscope.collectCpu(Number(req.query.seconds))
    res.status(200).send(p)
  } catch (e) {
    log('Error collecting cpu', e)
    res.sendStatus(500)
  }
  res.end()
}

async function handlerHeap(req: Request, res: Response) {
  log('Fetching Heap Profile')
  try {
    const p = await Pyroscope.collectHeap()
    res.status(200).send(p)
  } catch (e) {
    log('Error collecting Heap', e)
    res.sendStatus(500)
  }
  res.end()
}

export default function expressMiddleware(): (
  req: Request,
  res: Response,
  next: NextFunction
) => void {
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
