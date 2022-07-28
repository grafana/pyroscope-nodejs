import { Request, Response, NextFunction } from 'express';
export default function expressMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
