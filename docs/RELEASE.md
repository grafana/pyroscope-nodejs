## Release

Releases are managed by release-please.

1. Merge changes to `main` using conventional commit messages, such as `feat: ...`, `fix: ...`, or `chore: ...`.
2. release-please opens or updates a release PR that bumps `package.json` and `.release-please-manifest.json`.
3. Review and merge the release PR when ready to publish.
4. The publish workflow creates a draft GitHub release, publishes the package to [NPM](https://www.npmjs.com/package/@pyroscope/nodejs?activeTab=versions) using trusted publishing, then publishes the GitHub release.
5. If npm publishing fails, the GitHub release remains a draft so the workflow can be retried.

## Dev prereleases

To try out a branch in a real service before its PR merges, publish it as a prerelease:

```
gh workflow run release-please.yml -f branch=my-feature
```

or use the "Run workflow" button on the [Release Please workflow](https://github.com/grafana/pyroscope-nodejs/actions/workflows/release-please.yml) (run it from `main` and enter the branch as an input). The run pauses until a maintainer approves it, then publishes `<package.json version>-my-feature.<run number>` under the `dev` dist-tag, so `latest` is never affected. Install it with the exact version printed in the run summary:

```
npm install @pyroscope/nodejs@0.5.0-my-feature.42
```

The optional `suffix` input overrides the prerelease suffix (it defaults to the branch name, sanitized to valid semver prerelease characters, e.g. `feat/foo` becomes `feat-foo`).

Repeated publishes of the same branch get a new run number each time, since npm versions are immutable.
