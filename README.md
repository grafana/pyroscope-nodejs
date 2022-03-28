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
