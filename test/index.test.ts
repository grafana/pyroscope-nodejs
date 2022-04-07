import Pyroscope, {processProfile} from '../src/index'
import fs from 'fs';

test('basicFunctions', () => {
  expect(Pyroscope.init).toBeInstanceOf(Function);
  expect(Pyroscope.startCpuProfiling).toBeInstanceOf(Function);
  expect(Pyroscope.stopCpuProfiling).toBeInstanceOf(Function);
  expect(Pyroscope.startHeapProfiling).toBeInstanceOf(Function);
  expect(Pyroscope.stopHeapProfiling).toBeInstanceOf(Function);
})

test("process profile", () => {
  const profile = JSON.parse(fs.readFileSync('./test/profile1.json').toString());
  
  const newProfile = processProfile(profile);
})


test("tags definition", () => {
  
})
