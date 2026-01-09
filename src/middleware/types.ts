/**
 * Minimal type definitions for Express and Fastify middleware.
 *
 * These are defined locally to avoid requiring @types/express and @types/fastify
 * as dependencies for consumers who only use one framework. TypeScript's structural
 * typing ensures real Express/Fastify objects satisfy these minimal interfaces.
 */

// ============ Express Types ============

export interface ExpressRequest {
  method: string;
  path: string;
  query: Record<string, unknown>;
}

export interface ExpressResponse {
  status(code: number): this;
  send(body: unknown): this;
  sendStatus(code: number): this;
}

export type ExpressNextFunction = (err?: unknown) => void;

export type ExpressRequestHandler = (
  req: ExpressRequest,
  res: ExpressResponse,
  next: ExpressNextFunction
) => void | Promise<void>;

// ============ Fastify Types ============

export interface FastifyRequest<T = unknown> {
  query: T extends { Querystring: infer Q } ? Q : Record<string, unknown>;
}

export interface FastifyReply {
  status(code: number): this;
  type(contentType: string): this;
  send(payload?: unknown): this;
}

export type FastifyDoneCallback = (err?: Error) => void;

export interface FastifyInstance {
  get<T>(
    path: string,
    handler: (
      request: FastifyRequest<T>,
      reply: FastifyReply
    ) => Promise<void>
  ): void;
}

export type FastifyPluginCallback = (
  instance: FastifyInstance,
  options: Record<string, unknown>,
  done: FastifyDoneCallback
) => void;
