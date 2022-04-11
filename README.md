# Pyroscope nodejs package

## Usage

Module is available for both CommonJS and ESM variants, so you can use it the way it fits your project.

### Javascript

```
const Pyroscope = require('pyroscope');

Pyroscope.init({server: 'http://pyroscope:4040'});
```

### Typescript:
```
import Pyroscope from 'pyroscope';

Pyroscope.init({server: 'http://pyroscope:4040'});
```

Once you `init` Pyroscope with `autoStart` option defaulted or `true` it will immediately start both CPU and Memory profiling. 


### Debugging

Use `DEBUG` env var set to `pyroscope` to enable debugging messages. Otherwise all messages will be suppressed.

`DEBUG=pyroscope node index.js`


## API


### Configuration

```
init(c : PyroscopeConfig)

```

Configuration options
```
interface PyroscopeConfig {
    server: string;
    sourceMapPath?: string[];
    autoStart: boolean;
    name: string;
    tags: Record<string, any>;
}
```

### CPU Profiling
```
Pyroscope.startCpuProfiling()
Pyroscope.stopCpuProfiling()
```
### Heap Profiling
```
Pyroscope.startHeapProfiling()
Pyroscope.stopHeapProfiling()
```
