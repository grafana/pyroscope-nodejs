import Pryroscope from '../src/index'

test('basicFunctions', () => {
  expect(Pryroscope.init).toBeInstanceOf(Function);
  expect(Pryroscope.startCpuProfiling).toBeInstanceOf(Function);
  expect(Pryroscope.stopCpuProfiling).toBeInstanceOf(Function);
  expect(Pryroscope.startHeapProfiling).toBeInstanceOf(Function);
  expect(Pryroscope.stopHeapProfiling).toBeInstanceOf(Function);
})
