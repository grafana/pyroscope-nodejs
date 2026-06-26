/* eslint-disable */
const { execSync } = require('child_process');
/* eslint-enable */

try {
  execSync('git ls-files --error-unmatch src/version.ts', { stdio: 'ignore' });
} catch {
  console.error(
    'src/version.ts is not tracked by git. Run node tools/generate-version.js and commit the file.'
  );
  process.exit(1);
}

try {
  execSync('git diff --exit-code -- src/version.ts', { stdio: 'inherit' });
} catch {
  console.error(
    'src/version.ts is out of sync with package.json. Run: node tools/generate-version.js'
  );
  process.exit(1);
}
