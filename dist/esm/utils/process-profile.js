// eslint-disable-next-line @typescript-eslint/typedef
const V8_NAME_TO_GOLANG_NAME_MAP = {
    objects: 'inuse_objects',
    sample: 'samples',
    space: 'inuse_space',
};
export function processProfile(profile) {
    adjustSampleNames(profile);
    adjustCwdPaths(profile);
    return profile;
}
function adjustCwdPaths(profile) {
    for (const location of profile.location) {
        for (const line of location.line) {
            const functionId = Number(line.functionId);
            const contextFunction = profile.function[functionId - 1];
            if (contextFunction !== undefined) {
                const functionName = profile.stringTable.strings[Number(contextFunction.name)];
                if (!functionName?.includes(':') ||
                    functionName?.startsWith('(anonymous')) {
                    const fileName = profile.stringTable.strings[Number(contextFunction.filename)];
                    const newName = `${fileName.replace(process.cwd(), '.')}:${functionName}:${line.line}`;
                    contextFunction.name = profile.stringTable.dedup(newName);
                }
            }
        }
    }
}
function adjustSampleNames(profile) {
    // Replace the names of the samples to meet golang naming
    for (const valueType of profile.sampleType) {
        for (const [replacementsKey, replacementVal] of Object.entries(V8_NAME_TO_GOLANG_NAME_MAP)) {
            const unit = profile.stringTable.strings[Number(valueType.unit)];
            if (unit === replacementsKey) {
                valueType.unit = profile.stringTable.dedup(replacementVal);
            }
            const type = profile.stringTable.strings[Number(valueType.type)];
            if (type === replacementsKey) {
                valueType.type = profile.stringTable.dedup(replacementVal);
            }
        }
    }
}
