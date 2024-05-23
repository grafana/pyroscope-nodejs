import { NextFunction, Request, Response } from 'express';
export default function expressMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
