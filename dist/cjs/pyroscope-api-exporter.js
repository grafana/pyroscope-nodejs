"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PyroscopeApiExporter = void 0;
const node_url_1 = require("node:url");
const pprof_1 = require("@datadog/pprof");
const date_to_unix_timestamp_js_1 = require("./utils/date-to-unix-timestamp.js");
const process_profile_js_1 = require("./utils/process-profile.js");
const debug_1 = __importDefault(require("debug"));
const log = (0, debug_1.default)('pyroscope');
class PyroscopeApiExporter {
    applicationName;
    authToken;
    serverAddress;
    config;
    constructor(applicationName, authToken, serverAddress, config) {
        this.applicationName = applicationName;
        this.authToken = authToken;
        this.serverAddress = serverAddress;
        this.config = config;
    }
    async export(profileExport) {
        await this.uploadProfile(profileExport);
    }
    buildEndpointUrl(profileExport) {
        const endpointUrl = new node_url_1.URL(`${this.serverAddress}/ingest`);
        endpointUrl.searchParams.append('from', (0, date_to_unix_timestamp_js_1.dateToUnixTimestamp)(profileExport.startedAt).toString());
        endpointUrl.searchParams.append('name', this.applicationName);
        endpointUrl.searchParams.append('spyName', 'nodespy');
        endpointUrl.searchParams.append('until', (0, date_to_unix_timestamp_js_1.dateToUnixTimestamp)(profileExport.stoppedAt).toString());
        if (profileExport.sampleRate !== undefined) {
            endpointUrl.searchParams.append('sampleRate', profileExport.sampleRate.toString());
        }
        return endpointUrl;
    }
    buildRequestHeaders() {
        const headers = new Headers();
        if (this.authToken !== undefined) {
            headers.set('authorization', `Bearer ${this.authToken}`);
        }
        else if (this.config.basicAuthUser && this.config.basicAuthPassword) {
            headers.set('authorization', `Basic ${Buffer.from(`${this.config.basicAuthUser}:${this.config.basicAuthPassword}`).toString('base64')}`);
        }
        if (this.config.tenantID) {
            headers.set('X-Scope-OrgID', this.config.tenantID);
        }
        return headers;
    }
    async buildUploadProfileFormData(profile) {
        const processedProfile = (0, process_profile_js_1.processProfile)(profile);
        const profileBuffer = await (0, pprof_1.encode)(processedProfile);
        const formData = new FormData();
        formData.append('profile', new Blob([profileBuffer]), 'profile');
        return formData;
    }
    async uploadProfile(profileExport) {
        const formData = await this.buildUploadProfileFormData(profileExport.profile);
        try {
            const response = await fetch(this.buildEndpointUrl(profileExport).toString(), {
                body: formData,
                headers: this.buildRequestHeaders(),
                method: 'POST',
            });
            if (!response.ok) {
                log('Server rejected data ingest: HTTP %d', response.status);
                log(await response.text());
            }
        }
        catch (error) {
            if (error instanceof Error) {
                log('Error sending data ingest: %s', error.message);
            }
            else {
                log('Unknown error sending data ingest');
            }
        }
    }
}
exports.PyroscopeApiExporter = PyroscopeApiExporter;
