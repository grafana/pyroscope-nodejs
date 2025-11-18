# Pyroscope nodejs package

This is the nodejs profiling package for Grafana Pyroscope. It is based on the
work of [@datadog/pprof](https://github.com/DataDog/pprof-nodejs) and [v8's
sample based profiler][v8-prof]. And it adds:

- Wall and CPU profiles with support for dynamic tags
- Pull mode using express middleware
- Ability to Export to Grafana Pyroscope

## Downloads

Visit the [npm package][releases] to find the latest version of this package.

## Usage

Visit [docs](https://grafana.com/docs/pyroscope/latest/configure-client/language-sdks/nodejs/) page for usage and configuration documentation.

[Grafana Pyroscope]: https://grafana.com/oss/pyroscope/
[@datadog/pprof]: https://github.com/DataDog/pprof-nodejs
[v8-prof]: https://v8.dev/docs/profile
[docs]: https://grafana.com/docs/pyroscope/latest/configure-client/language-sdks/nodejs
[releases]: https://www.npmjs.com/package/@pyroscope/nodejs

## Release

1. Create new release branch (e.g. `v0.4.8`)
2. Update `package.json` with new RC version (e.g. `v0.4.8-rc1`)
3. Create new RC tag (e.g. `v0.4.8-rc1`)
4. Push branch and tag, confirm [release and publish action](https://github.com/grafana/pyroscope-nodejs/actions/workflows/publish.yml) is successful
5. Confirm RC is [available in NPM](https://www.npmjs.com/package/@pyroscope/nodejs?activeTab=versions)
6. New RCs are added to the release branch with new tags (e.g. `v0.4.8-rc2`) with `package.json` version updated appropriately
7. Once ready for release, update `package.json` version and merge branch PR to main
8. Finally, set release tag (e.g. `v0.4.8`) on this commit in main and confirm release

## Maintainers

This package is maintained by [@grafana/pyroscope-nodejs](https://github.com/orgs/grafana/teams/pyroscope-nodejs).
Mention this team on issues or PRs for feedback.
