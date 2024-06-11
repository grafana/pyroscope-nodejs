// source: https://jestjs.io/docs/code-transformation#examples

import 'path';

module.exports = {
  process(src, filename) {
    return 'module.exports = ' + JSON.stringify(path.basename(filename)) + ';';
  },
};
