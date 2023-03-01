const Pyroscope = require('../dist/cjs')

module.exports = async function () {
  console.log('tearing down')
  Pyroscope.stopWallProfiling()
  await Pyroscope.stopCpuProfiling()
  await Pyroscope.stopHeapProfiling()
}
