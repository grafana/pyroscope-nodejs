import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { SourceMapper } from '../src/sourcemapper.ts';

function buildMinimalSourceMap(file: string): string {
  // sourceRoot filler is sized so the JSON length is divisible by 3 — the
  // resulting base64 has no '=' padding. Without padding, Node's lenient
  // base64 decoder keeps decoding past the legitimate payload into any
  // trailing garbage. That makes the over-capture from the pre-fix regex
  // (which slurped past the line break into the next directive) corrupt
  // the decoded JSON instead of being silently truncated at the padding.
  for (let pad = 0; pad < 3; pad++) {
    const json = JSON.stringify({
      version: 3,
      file,
      sources: [file.replace(/\.js$/, '.ts')],
      names: [],
      mappings: '',
      sourceRoot: 'a'.repeat(pad),
    });
    if (!Buffer.from(json).toString('base64').endsWith('=')) {
      return json;
    }
  }
  throw new Error(
    'failed to pad source map JSON to a length without base64 padding'
  );
}

function buildJsWithInlineSourceMap(
  sourceMapJson: string,
  {
    directiveCount = 1,
    trailingOnDirectiveLine = '',
  }: { directiveCount?: number; trailingOnDirectiveLine?: string } = {}
): string {
  const base64 = Buffer.from(sourceMapJson).toString('base64');
  const directives = Array.from(
    { length: directiveCount },
    () =>
      `//# sourceMappingURL=data:application/json;base64,${base64}${trailingOnDirectiveLine}`
  ).join('\n');
  return `console.log('hi');\n${directives}\n`;
}

describe('SourceMapper inline base64 sourcemap', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pyroscope-sm-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parses a single inline //# sourceMappingURL= directive', async () => {
    const jsFile = path.join(tmpDir, 'app.js');
    fs.writeFileSync(
      jsFile,
      buildJsWithInlineSourceMap(buildMinimalSourceMap('app.js'))
    );

    const mapper = await SourceMapper.create([tmpDir]);

    expect(mapper.hasMappingInfo(jsFile)).toBe(true);
  });

  // Regression test for the regex at sourcemapper.ts:89. Some bundlers (or
  // files concatenated from multiple bundles) emit more than one
  // //# sourceMappingURL=data:... directive in a single file. A [^ ]*
  // terminator does not stop at line breaks, so it greedily consumes
  // across the second directive, producing invalid base64.
  it('parses inline sourceMappingURL when the file emits the directive twice', async () => {
    const jsFile = path.join(tmpDir, 'multi.js');
    fs.writeFileSync(
      jsFile,
      buildJsWithInlineSourceMap(buildMinimalSourceMap('multi.js'), {
        directiveCount: 2,
      })
    );

    const mapper = await SourceMapper.create([tmpDir]);

    expect(mapper.hasMappingInfo(jsFile)).toBe(true);
  });

  // The capture must also terminate at non-base64 characters that appear on
  // the same line as the directive. A [^\r\n]* terminator would swallow a
  // trailing inline comment, producing trailing chars that decode to garbage
  // appended to the JSON payload.
  it('parses inline sourceMappingURL with a trailing inline comment on the same line', async () => {
    const jsFile = path.join(tmpDir, 'trailing.js');
    fs.writeFileSync(
      jsFile,
      buildJsWithInlineSourceMap(buildMinimalSourceMap('trailing.js'), {
        trailingOnDirectiveLine: ' // extra',
      })
    );

    const mapper = await SourceMapper.create([tmpDir]);

    expect(mapper.hasMappingInfo(jsFile)).toBe(true);
  });
});
