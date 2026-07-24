import { randomBytes } from 'node:crypto';

const CRLF = '\r\n';

export interface MultipartRequestBody {
  body: Uint8Array<ArrayBuffer>;
  contentType: string;
}

// Serializes a single `profile` part into a multipart/form-data request body
// as a plain, fully-materialized Uint8Array instead of a `FormData` + `Blob`.
//
// WHY this is a hand-rolled buffer rather than `FormData`:
//
// When the request body is a `FormData` containing a `Blob`, undici's `fetch`
// serializes each blob part by calling `blob.stream()`. On Node 24.16.0 -
// 24.18.0 `Blob.prototype.stream()` pins the source `ArrayBuffer` in an
// eternal (never-released) handle, so every flush leaks one payload-sized
// ArrayBuffer. With two profilers flushing on the default interval this is a
// steady, monotonic native-memory leak (~45-80 MB/day in production) that a
// long-lived process never recovers.
//   - node core bug:  https://github.com/nodejs/node/issues/63574
//   - core fix (main, not yet on 24.x): https://github.com/nodejs/node/pull/63577
//   - 24.x backport tracking:            https://github.com/nodejs/node/issues/64105
//
// Passing a typed-array body sidesteps `Blob.stream()` entirely, so the leak
// cannot occur on any Node version. It also avoids a wasteful
// Buffer -> Blob -> stream round-trip on every flush on all versions. The bytes
// produced here are wire-identical to what undici emits for the equivalent
// `FormData`/`Blob` (same part framing, headers, and CRLF placement); only the
// boundary token differs, which is arbitrary by design.
export function buildProfileMultipartBody(
  content: Uint8Array<ArrayBuffer>
): MultipartRequestBody {
  const boundary = `----pyroscope${randomBytes(16).toString('hex')}`;

  const header: Buffer = Buffer.from(
    `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="profile"; filename="profile"${CRLF}` +
      `Content-Type: application/octet-stream${CRLF}${CRLF}`,
    'utf8'
  );
  const footer: Buffer = Buffer.from(`${CRLF}--${boundary}--${CRLF}`, 'utf8');

  const body: Buffer<ArrayBuffer> = Buffer.concat([header, content, footer]);

  return {
    body: new Uint8Array(body.buffer, body.byteOffset, body.byteLength),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}
