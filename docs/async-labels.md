# Attribute CPU and wall profiles to async work

Enable `wall.asyncContext` to keep `wrapWithLabels` labels across promises,
timers and other async descendants. Concurrent scopes remain isolated. The
option defaults to `false`; heap profiles are unaffected.

## Enable native async contexts

Use Node.js 24 or newer with its default AsyncContextFrame implementation, or
start Node.js 22 with:

```sh
node --experimental-async-context-frame app.js
```

Configure the SDK before starting profiling:

```js
import Pyroscope from '@pyroscope/nodejs';

Pyroscope.init({
  appName: 'web',
  serverAddress: 'http://localhost:4040',
  wall: { asyncContext: true },
});
Pyroscope.start();
```

Alternatively, set `PYROSCOPE_WALL_ASYNC_CONTEXT=true` (or `1`). An explicit
`wall.asyncContext` value takes precedence over the environment variable.

Startup checks that the native profiler can read a scoped context. Unsupported
runtimes, including Node.js 20, Node.js 22 without the flag, and Node.js 24+
with `--no-async-context-frame`, throw an error rather than silently losing
labels. A failed capability check stops the newly started wall profiler; an
application can reinitialize with `wall.asyncContext: false` if it deliberately
chooses synchronous-only labeling.

## Wrap the work, including its async continuations

Wrap the application handler before it schedules the work to attribute:

```js
const result = await Pyroscope.wrapWithLabels(
  { page: 'item', navigation: 'document' },
  async () => {
    const item = await loadItem();
    return renderItem(item);
  }
);
```

Here `loadItem` and `renderItem` are application functions. Labels are attached
to samples collected while this scope or its async descendants execute. Shared
framework/library functions inherit the labels too. Profiling does not
reconstruct an async call stack or turn an await duration into CPU time.

- Nested scopes merge labels; an inner value overrides the same outer key.
  Returning or throwing restores the caller's context.
- The wrapper forwards arguments and returns the callback's exact result,
  including the original promise. Exceptions and rejections propagate unchanged.
- `getLabels()` reads the active scope. Outside a scope it returns `{}`.
- `setLabels()` and the deprecated `setWallLabels()` throw in async-context mode.
  Use a nested `wrapWithLabels` scope instead of mutating shared labels.
- Regular profile flushes preserve in-flight scopes. Start profiling before
  opening scopes, and finish the work before fully stopping profiling. Scopes
  do not survive a full stop/start cycle.
- Context follows async-resource creation, not the HTTP response lifetime.
  Detached tasks can retain labels after a response completes; a preexisting
  `AsyncResource` retains its creation context. Shared schedulers and connection
  pools need integration testing in the application.

Use bounded labels such as page types or route templates. Do not use raw URLs,
item IDs, user IDs or other high-cardinality/private values. Use `tags` in SDK
configuration for static application labels. Do not run another CPU/wall
profiler alongside this SDK: the native profiler is process-global. Stop the
SDK before calling `init` again.

## Without async-context mode

The default `wrapWithLabels` scope remains synchronous: it restores labels as
soon as the callback returns, even if the returned value is a promise. It now
also restores labels when a callback throws and returns the callback's result.
`setLabels` retains its process-global behavior in this mode and is not safe
for overlapping async request lifetimes.
