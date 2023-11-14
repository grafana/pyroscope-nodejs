# Pyroscope nodejs package

## Running Pyroscope server
In order to send data from your node application to Pyroscope, you'll first need to run the Pyroscope server. If on a mac you can simply do this with
```
# install pyroscope
brew install pyroscope-io/brew/pyroscope

# start pyroscope server:
pyroscope server
```
or if not then see [the documentation](https://github.com/pyroscope-io/pyroscope#add-pyroscope-server-locally-in-2-steps) for more info on how to start the server.

## Configuration

| env var                       | default                 | description                                                          |
| ----------------------------- | ----------------------- | -------------------------------------------------------------------- |
| `PYROSCOPE_SAMPLING_INTERVAL` | `10`                    | The interval in milliseconds between samples.                        |
| `PYROSCOPE_SAMPLING_DURATION` | `10000` (10s)           | The duration in milliseconds for which you want to collect a sample. |
| `PYROSCOPE_SERVER_ADDRESS`    | `http://localhost:4040` | The address of the Pyroscope server.                                 |
| `PYROSCOPE_APPLICATION_NAME`  | `""`                    | The application name used when uploading profiling data.             |
| `PYROSCOPE_AUTH_TOKEN`        | N/A                     | The authorization token used to upload profiling data.               |

## Modes

Pyroscope supports two main operation modes: 
 * Push mode
 * Pull mode

Push mode means the package itself uploads profile data to a pyroscope server, when pull mode means you provide pyroscope server with an endponts to scrape profile data

NodeJS Pyroscope module supports collecting cpu, wall-time and heap. More details you may find [here](https://cloud.google.com/profiler/docs/concepts-profiling)

## Push mode

Usage is differs for first you need to import and init pyroscope module.
Module is available for both CommonJS and ESM variants, so you can use it the way it fits your project.

### Javascript

```javascript
const Pyroscope = require('@pyroscope/nodejs');

Pyroscope.init({serverAddress: 'http://pyroscope:4040', appName: 'nodejs'});
Pyroscope.start();
```

### Typescript:
```typescript
import Pyroscope from '@pyroscope/nodejs';

Pyroscope.init({serverAddress: 'http://pyroscope:4040', appName: 'nodejs'});
Pyroscope.start();
```

Both params `appName` and `serverAddress` are mandatory. Once you `init` you may `startCpuProfiling()`, `startWallProfiling()` and/or `startHeapProfiling()`. `start()` starts both memory and CPU profiling

### Dynamic tags
You may assign certain labels to certain parts of your code by using wrapper function `tagWrapper(tags: Record<string, string | number | undefined>, fn: Function)`. Please note that this only 
available for cpu profiling.

```typescript
...

app.get('/scooter', function scooterSearchHandler(req, res) {
  Pyroscope.tagWrapper({'vehicle':'scooter'}, () =>
    genericSearchHandler(0.1)(req, res)
  );
});

```

## Pull Mode

In order to enable pull mode you need to implement follwing endpoints:
 * `/debug/pprof/profile` -- for wall-time profiling
 * `/debug/pprof/heap` -- for heap profiling

You may implement your own enpoints with Pyroscope API, like in the example:

```javascript
Pyroscope.init()

app.get('/debug/pprof/profile', async function handler(req, res) {
  console.log('Collecting Cpu for', req.query.seconds);
  try {
    const p = await Pyroscope.collectCpu(req.query.seconds);
    res.send(p);
  } catch (e) {
    console.error('Error collecting cpu', e);
    res.sendStatus(500);
  }
});
```

Parameter `appName` is mandatory in pull mode.

## Pull Mode

In order to enable pull mode you need to implement follwing endpoints:
 * `/debug/pprof/profile` -- for wall-time profiling
 * `/debug/pprof/heap` -- for heap profiling

You may implement your own enpoints with Pyroscope API, like in the example:

```javascript
app.get('/debug/pprof/profile', async function handler(req, res) {
  console.log('Collecting Cpu for', req.query.seconds);
  try {
    const p = await Pyroscope.collectCpu(req.query.seconds);
    res.send(p);
  } catch (e) {
    console.error('Error collecting cpu', e);
    res.sendStatus(500);
  }
});
```

or you may use express middleware. 

```javascript
import Pyroscope, { expressMiddleware } from '@pyroscope/nodejs'

Pyroscope.init()
const app = express()
app.use(expressMiddleware());
```

then you also need to configure your pyroscope server by providing config file 

```yaml
---
log-level: debug
scrape-configs:
  - job-name: testing            # any name 
    enabled-profiles: [cpu, mem] # cpu and mem for cpu and heap
    static-configs:
      - application: rideshare
        spy-name: nodespy        # make pyroscope know it's node profiles
        targets:
          - localhost:3000       # address of your scrape target
        labels:     
          env: dev               # labels

```
### Debugging

Use `DEBUG` env var set to `pyroscope` to enable debugging messages. Otherwise all messages will be suppressed.

`DEBUG=pyroscope node index.js`
## API
### Configuration

```
init(c : PyroscopeConfig)

```

Configuration options
```typescript
interface PyroscopeConfig {
    serverAddress?: string;         // Server address for push mode
    sourceMapPath?: string[];       // Sourcemaps directories (optional)
    appName?: string;               // Application name
    tags?: Record<string, any>;     // Static tags 
    authToken?: string              // Auth token for cloud version
}
```

Both `serverAddress` and `appName` are mandatory for push mode.

### CPU Profiling
```javascript
// Start collecting for 10s and push to server
Pyroscope.startCpuProfiling()
Pyroscope.stopCpuProfiling()

// Or do it manually
Pyroscope.collectCpu(seconds?:number);
```

### Wall Profiling
```javascript
// Start collecting for 10s and push to server
Pyroscope.startWallProfiling()
Pyroscope.stopWallProfiling()

// Or do it manually
Pyroscope.collectWall(seconds?:number);
```

### Heap Profiling
```javascript
// Start heap profiling and upload to server
Pyroscope.startHeapProfiling()
Pyroscope.stopHeapProfiling()

// Or do it manually
Pyroscope.startHeapCollecting()
Pyroscope.collectHeap();
Pyroscope.stopHeapCollecting()
```

