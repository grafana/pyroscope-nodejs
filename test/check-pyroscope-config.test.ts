import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { checkPyroscopeConfig } from '../src/utils/check-pyroscope-config.js';

const INVALID_CHARACTERS = ['{', '}', ',', '='];

describe('checkPyroscopeConfig', () => {
  it('accepts a valid config', () => {
    assert.doesNotThrow(() =>
      checkPyroscopeConfig({
        appName: 'my-app',
        tags: { region: 'us-east-1', replica: 3 },
      })
    );
  });

  for (const character of INVALID_CHARACTERS) {
    it(`rejects appName containing "${character}"`, () => {
      assert.throws(
        () => checkPyroscopeConfig({ appName: `my${character}app` }),
        /appName must not contain/
      );
    });

    it(`rejects tag key containing "${character}"`, () => {
      assert.throws(
        () =>
          checkPyroscopeConfig({
            appName: 'my-app',
            tags: { [`bad${character}key`]: 'value' },
          }),
        new RegExp(`tag key "bad\\${character}key" must not contain`)
      );
    });

    it(`rejects tag value containing "${character}"`, () => {
      assert.throws(
        () =>
          checkPyroscopeConfig({
            appName: 'my-app',
            tags: { key: `bad${character}value` },
          }),
        new RegExp(`tag value "bad\\${character}value" for key "key"`)
      );
    });
  }

  it('rejects a tag value that is not a string or number', () => {
    assert.throws(
      () =>
        checkPyroscopeConfig({
          appName: 'my-app',
          tags: { key: true },
        }),
      /tag value "true" for key "key" must be a string or number/
    );
  });
});
