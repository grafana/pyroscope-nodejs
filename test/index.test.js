const Pyroscope = require('@pyroscope/nodejs')
const { expressMiddleware } = require('@pyroscope/nodejs')

test('correct Imports', () => {
    expect(Pyroscope.init).toBeInstanceOf(Function);
    expect(Pyroscope.startWallProfiling).toBeInstanceOf(Function);
    expect(Pyroscope.stopWallProfiling).toBeInstanceOf(Function);
    expect(Pyroscope.startHeapProfiling).toBeInstanceOf(Function);
    expect(Pyroscope.stopHeapProfiling).toBeInstanceOf(Function);  
    expect(Pyroscope.startCpuProfiling).toBeInstanceOf(Function);
    expect(Pyroscope.stopCpuProfiling).toBeInstanceOf(Function);

    expect(expressMiddleware).toBeInstanceOf(Function);
});
