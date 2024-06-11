import { Function as PprofFunction, Profile } from 'pprof-format'

// eslint-disable-next-line @typescript-eslint/typedef
const V8_NAME_TO_GOLANG_NAME_MAP: Record<string, string> = {
  objects: 'inuse_objects',
  sample: 'samples',
  space: 'inuse_space',
}

export function processProfile(profile: Profile): Profile {
  adjustSampleNames(profile)
  adjustCwdPaths(profile)

  return profile
}

function adjustCwdPaths(profile: Profile): void {
  for (const location of profile.location) {
    for (const line of location.line) {
      const functionId = Number(line.functionId)
      const contextFunction: PprofFunction | undefined =
        profile.function[functionId - 1]

      if (contextFunction !== undefined) {
        const functionName: string | undefined =
          profile.stringTable.strings[Number(contextFunction.name)]

        if (
          !functionName?.includes(':') ||
          functionName?.startsWith('(anonymous')
        ) {
          const fileName: string = profile.stringTable.strings[
            Number(contextFunction.filename)
          ] as string

          const newName = `${fileName.replace(
            process.cwd(),
            '.'
          )}:${functionName}:${line.line}`

          contextFunction.name = profile.stringTable.dedup(newName)
        }
      }
    }
  }
}

function adjustSampleNames(profile: Profile): void {
  // Replace the names of the samples to meet golang naming
  for (const valueType of profile.sampleType) {
    for (const [replacementsKey, replacementVal] of Object.entries(
      V8_NAME_TO_GOLANG_NAME_MAP
    )) {
      const unit: string | undefined =
        profile.stringTable.strings[Number(valueType.unit)]

      if (unit === replacementsKey) {
        valueType.unit = profile.stringTable.dedup(replacementVal)
      }

      const type: string | undefined =
        profile.stringTable.strings[Number(valueType.type)]

      if (type === replacementsKey) {
        valueType.type = profile.stringTable.dedup(replacementVal)
      }
    }
  }
}
