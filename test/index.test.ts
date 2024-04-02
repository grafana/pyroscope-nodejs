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

    expect(newProfile.stringTable.strings.length).toBe(19)

    // Check we're receiving right data
    expect(newProfile.stringTable.strings).toContain(
      'node:internal/modules/run_main'
    )
    expect(newProfile.stringTable.strings).toContain(
      '/home/korniltsev/pyroscope/pyroscope-nodejs/dist/cjs/cpu.js'
    )

    // // Check profiles replacement works
    expect(profile.stringTable.strings).toContain('sample')
    expect(newProfile.stringTable.strings).toContain('samples')
  })
})
