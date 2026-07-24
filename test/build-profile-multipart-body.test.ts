import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';

import busboy from 'busboy';

import { buildProfileMultipartBody } from '../src/utils/build-profile-multipart-body.js';

interface ParsedPart {
  name: string;
  filename: string | undefined;
  mimeType: string;
  data: Buffer;
}

// Parse a multipart/form-data payload with busboy, the same parser the
// profiler integration tests use to decode uploads.
const parseMultipart = (
  body: Uint8Array,
  contentType: string
): Promise<ParsedPart[]> =>
  new Promise<ParsedPart[]>((resolve, reject) => {
    const bb = busboy({ headers: { 'content-type': contentType } });
    const partPromises: Promise<ParsedPart>[] = [];

    bb.on('file', (name, stream, info) => {
      partPromises.push(
        stream.toArray().then((chunks: Buffer[]) => ({
          name,
          filename: info.filename,
          mimeType: info.mimeType,
          data: Buffer.concat(chunks),
        }))
      );
    });
    // 'close' can fire before the per-file toArray() promises settle, so wait
    // on them before resolving.
    bb.on('close', () => {
      Promise.all(partPromises).then(resolve).catch(reject);
    });
    bb.on('error', reject);

    Readable.from(Buffer.from(body)).pipe(bb);
  });

describe('buildProfileMultipartBody', () => {
  it('sets a multipart/form-data content type with a pyroscope boundary', () => {
    const { contentType } = buildProfileMultipartBody(
      new Uint8Array([1, 2, 3])
    );

    assert.match(
      contentType,
      /^multipart\/form-data; boundary=----pyroscope[0-9a-f]{32}$/
    );
  });

  it('serializes the profile part with bytes intact (byte-equal to input)', async () => {
    // Random bytes exercise binary content, including sequences that could
    // resemble CRLF/boundary framing.
    const content = new Uint8Array(randomBytes(4096).buffer);

    const { body, contentType } = buildProfileMultipartBody(content);
    const parts = await parseMultipart(body, contentType);

    assert.equal(parts.length, 1);
    const [part] = parts;
    assert.equal(part.name, 'profile');
    assert.equal(part.filename, 'profile');
    assert.equal(part.mimeType, 'application/octet-stream');
    // Byte-for-byte equality with the buffer handed to the serializer.
    assert.deepEqual(new Uint8Array(part.data), content);
  });

  it('produces a body that is not a Blob (avoids Blob.stream leak)', () => {
    const { body } = buildProfileMultipartBody(
      new Uint8Array([0, 255, 10, 13])
    );

    assert.ok(body instanceof Uint8Array);
  });
});
