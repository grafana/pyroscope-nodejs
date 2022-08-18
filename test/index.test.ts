import Pyroscope, {expressMiddleware, processProfile} from '../'
import fs from 'fs';
import { fixNanosecondsPeriod } from '../src/cpu.js';

describe('typescript env', () => {
  it('has correct imports', () => {
    expect(Pyroscope.init).toBeInstanceOf(Function);
    expect(Pyroscope.startWallProfiling).toBeInstanceOf(Function);
    expect(Pyroscope.stopWallProfiling).toBeInstanceOf(Function);
    expect(Pyroscope.startHeapProfiling).toBeInstanceOf(Function);
    expect(Pyroscope.stopHeapProfiling).toBeInstanceOf(Function);  
    expect(Pyroscope.startCpuProfiling).toBeInstanceOf(Function);
    expect(Pyroscope.stopCpuProfiling).toBeInstanceOf(Function);

    expect(expressMiddleware).toBeInstanceOf(Function);
  })

  it("can process profile", () => {
    const profile = JSON.parse(fs.readFileSync('./test/profile1.json').toString());
    
    const newProfile = processProfile(profile);
    expect(newProfile?.stringTable?.length).toBe(176);

    // Check we're receiving right data
    expect(newProfile?.stringTable).toContain('./dist/cjs/index.js:startCpuProfiling:144');
    expect(newProfile?.stringTable).toContain('./dist/cjs/index.js:profilingRound:129');

    // Check profiles replacement works
    expect(profile?.stringTable).toContain('sample');
    expect(newProfile?.stringTable).toContain('samples');
  })

  it("can fix nanoseconds", () => {
    const profile = JSON.parse(fs.readFileSync('./test/profile1.json').toString());
    
    const newProfile = fixNanosecondsPeriod( processProfile(profile) );
    
    expect(newProfile.period).toBe(10000000);    
  })
});
