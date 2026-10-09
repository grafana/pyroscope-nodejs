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

Async labels are opt-in: configure `wall: { asyncContext: true }`, then use
`wrapWithLabels` to scope work across `await`. Requires Node.js 24+ with
AsyncContextFrame enabled, or Node.js 22 with
`--experimental-async-context-frame`. `setLabels` is unsupported in this mode;
heap profiles are unchanged.

[Grafana Pyroscope]: https://grafana.com/oss/pyroscope/
[@datadog/pprof]: https://github.com/DataDog/pprof-nodejs
[v8-prof]: https://v8.dev/docs/profile
[docs]: https://grafana.com/docs/pyroscope/latest/configure-client/language-sdks/nodejs
[releases]: https://www.npmjs.com/package/@pyroscope/nodejs

## Maintainers

This package is maintained by [@grafana/pyroscope-nodejs](https://github.com/orgs/grafana/teams/pyroscope-nodejs).
Mention this team on issues or PRs for feedback.
