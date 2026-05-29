## Release

Releases are managed by release-please.

1. Merge changes to `main` using conventional commit messages, such as `feat: ...`, `fix: ...`, or `chore: ...`.
2. release-please opens or updates a release PR that bumps `package.json` and `.release-please-manifest.json`.
3. Review and merge the release PR when ready to publish.
4. The publish workflow creates a draft GitHub release, publishes the package to [NPM](https://www.npmjs.com/package/@pyroscope/nodejs?activeTab=versions) using trusted publishing, then publishes the GitHub release.
5. If npm publishing fails, the GitHub release remains a draft so the workflow can be retried.
