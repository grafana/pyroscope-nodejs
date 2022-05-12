import Pyroscope from '@pyroscope/nodejs'
jest.setTimeout(11000)
describe('common behavour of profilers', () => {
    it('should require server name and app name as options', (done) => {

        Pyroscope.init({})
        expect(Pyroscope.start).toThrowError("Pyroscope is not configured. Please call init() first.");
        
        Pyroscope.init({serverAddress: "http://pyroscope:4040"})
        expect(Pyroscope.start).toThrowError("Pyroscope is not configured. Please call init() first.");

        Pyroscope.init({serverAddress: "http://pyroscope:4040", appName: "nodejs"})
        expect(Pyroscope.start).not.toThrowError("Pyroscope is not configured. Please call init() first.")
        Pyroscope.stop()

        // Wait for 10 seconds until exit
        setTimeout(() => {
            done();
        }, 10200);
    })
});
