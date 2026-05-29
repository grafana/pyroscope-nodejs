declare namespace express {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Request = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Response = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type RequestHandler = any;
}

declare module 'express' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const express: any;
  export = express;
}
