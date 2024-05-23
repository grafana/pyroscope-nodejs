import debug from 'debug';
const log = debug('pyroscope::profiler');
export class ContinuousProfiler {
    profiler;
    exporter;
    flushIntervalMs;
    startArgs;
    timer;
    lastExport;
    constructor(input) {
        this.exporter = input.exporter;
        this.flushIntervalMs = input.flushIntervalMs;
        this.profiler = input.profiler;
        this.startArgs = input.startArgs;
    }
    start() {
        if (this.timer !== undefined) {
            log('already started');
            return;
        }
        log('start');
        this.profiler.start(this.startArgs);
        this.scheduleProfilingRound();
    }
    async stop() {
        if (this.timer === undefined) {
            log('already stopped');
            return;
        }
        log('stopping');
        clearTimeout(this.timer);
        this.timer = undefined;
        if (this.lastExport !== undefined) {
            await this.lastExport;
        }
        try {
            const profileExport = this.profiler.stop();
            if (profileExport !== null) {
                log('profile exporting');
                await this.exporter.export(profileExport);
            }
        }
        catch (e) {
            log(`failed to capture last profile during stop: ${e}`);
        }
    }
    scheduleProfilingRound() {
        this.timer = setTimeout(() => {
            setImmediate(() => {
                void this.profilingRound();
                this.scheduleProfilingRound();
            });
        }, this.flushIntervalMs);
    }
    async profilingRound() {
        const profileExport = this.profiler.profile();
        if (this.lastExport === undefined) {
            this.lastExport = this.exporter.export(profileExport).catch();
            await this.lastExport;
            this.lastExport = undefined;
        }
    }
}
