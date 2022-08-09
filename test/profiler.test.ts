import Pyroscope from '@pyroscope/nodejs'
import express, { application } from 'express'

jest.setTimeout(15000)
describe('common behavour of profilers', () => {


    it('should require server name and app name as options', (done) => {
        Pyroscope.init({})
        expect(Pyroscope.start).toThrowError("Please set the server address in the init()");

        Pyroscope.init({appName: "nodejs"});
        expect(Pyroscope.start).toThrowError("Please set the server address in the init()");

        done();
    })

    it('should call a server on startCpuProfiling and clear gracefully', (done) => {
        Pyroscope.init({serverAddress: "http://localhost:4445", appName: "nodejs"})
        const app = express();
        const server = app.listen(4445, () => {
            Pyroscope.startWallProfiling()

        });
        app.post('/ingest', (req, res) => {
            Pyroscope.stopWallProfiling()
            expect(req.query['spyName']).toEqual('nodespy');
            expect(req.query['name']).toEqual('nodejs{}');

            setImmediate(() => {
                server.close();
                done()
            })
            res.send("ok")
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

            setImmediate(() => {
                server.close();
                done()
            })
            res.send("ok")
        });
    });

    it('should allow to call start profiling twice', (done) => {
        Pyroscope.init({serverAddress: "http://localhost:4444", appName: "nodejs"})
        Pyroscope.startHeapProfiling();
        Pyroscope.startHeapProfiling();
        Pyroscope.stopHeapProfiling();
        Pyroscope.stopHeapProfiling();
        // And stop it without starting CPU
        Pyroscope.stop();
        done()
    })

    it('should not allow to start cpu and wall profiling at the same time', (done) => {
        Pyroscope.init({serverAddress: "http://localhost:4444", appName: "nodejs"})
        Pyroscope.startCpuProfiling();
        Pyroscope.startWallProfiling();

        setImmediate(() => {
            Pyroscope.stopWallProfiling();
            Pyroscope.stopCpuProfiling();
            // And stop it without starting CPU
            setTimeout(done, 10000);
        });
    })    

});
