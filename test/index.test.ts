import fs from 'node:fs'
import { Profile } from 'pprof-format'
import Pyroscope, { expressMiddleware } from '../src'
import { processProfile } from '../src/utils/process-profile'

describe('typescript env', () => {
  it('has correct imports', () => {
    expect(Pyroscope.init).toBeInstanceOf(Function)
    expect(Pyroscope.startWallProfiling).toBeInstanceOf(Function)
    expect(Pyroscope.stopWallProfiling).toBeInstanceOf(Function)
    expect(Pyroscope.startHeapProfiling).toBeInstanceOf(Function)
    expect(Pyroscope.stopHeapProfiling).toBeInstanceOf(Function)

    expect(expressMiddleware).toBeInstanceOf(Function)
  })

  it('can process profile', () => {
    const profile = Profile.decode(fs.readFileSync('./test/profile1.data'))
    const newProfile = processProfile(profile)

    expect(newProfile.stringTable.strings.length).toBe(20)

    // Check we're receiving right data
    expect(newProfile.stringTable.strings).toContain(
      'node:internal/main/run_main_module:(anonymous):1'
    )
    expect(newProfile.stringTable.strings).toContain(
      '/home/korniltsev/WebstormProjects/pyro-playground/index.js:fib:36'
    )

    // // Check profiles replacement works
    expect(profile.stringTable.strings).toContain('sample')
    expect(newProfile.stringTable.strings).toContain('samples')
  })
})
