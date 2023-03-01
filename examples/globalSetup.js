module.exports = function () {
  //  process.env['PYROSCOPE_SAMPLING_DURATION'] = 10
  //  process.env['PYROSCOPE_SAMPLING_INTERVAL'] = 1
  const Pyroscope = require('../dist/cjs')

  Pyroscope.init({
    appName: 'pyroscope.tests',
    serverAddress: 'noop',
  })

  Pyroscope.startCpuProfiling()
  Pyroscope.startHeapProfiling()
  Pyroscope.startWallProfiling()
}
