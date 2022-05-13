import Pyroscope from '@pyroscope/nodejs'
import express, { application } from 'express'

jest.setTimeout(15000)
describe('common behavour of profilers', () => {


    it('should require server name and app name as options', (done) => {
        Pyroscope.init({})
        expect(Pyroscope.start).toThrowError("Pyroscope is not configured. Please call init() first.");
        
        Pyroscope.init({serverAddress: "http://pyroscope:4040"})
        expect(Pyroscope.start).toThrowError("Pyroscope is not configured. Please call init() first.");

        Pyroscope.init({serverAddress: "http://pyroscope:4040", appName: "nodejs"})
        expect(Pyroscope.start).not.toThrowError("Pyroscope is not configured. Please call init() first.")
        Pyroscope.stop()
        process.nextTick(() => {
            done();
        });
    })

    it('should call a server on startCpuProfiling and clear gracefully', (done) => {
        Pyroscope.init({serverAddress: "http://localhost:4040", appName: "nodejs"})
        const app = express();
        const server = app.listen(4040, () => {
            Pyroscope.startCpuProfiling()

        });
        app.post('/ingest', (req, res) => {
            Pyroscope.stopCpuProfiling()
            expect(req.query['spyName']).toEqual('nodespy');
            expect(req.query['name']).toEqual('nodejs{}');

            res.send("ok")
            server.close(done);
        });
    });

    it('should call a server on startHeapProfiling and clear gracefully', (done) => {
        Pyroscope.init({serverAddress: "http://localhost:4444", appName: "nodejs", tags: {env: "test env"}})
        const app = express();
        const server = app.listen(4444, () => {
            Pyroscope.startHeapProfiling()
        });
        app.post('/ingest', (req, res) => {
            Pyroscope.stopHeapProfiling()
            expect(req.query['spyName']).toEqual('nodespy');
            expect(req.query['name']).toEqual('nodejs{env=test env}');

            res.send("ok")
            server.close(done);
        });
    });

});
