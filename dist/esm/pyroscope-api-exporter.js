import { URL } from 'node:url';
import { encode } from '@datadog/pprof';
import { dateToUnixTimestamp } from './utils/date-to-unix-timestamp.js';
import { processProfile } from './utils/process-profile.js';
import debug from 'debug';
const log = debug('pyroscope');
export class PyroscopeApiExporter {
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
        const endpointUrl = new URL(`${this.serverAddress}/ingest`);
        endpointUrl.searchParams.append('from', dateToUnixTimestamp(profileExport.startedAt).toString());
        endpointUrl.searchParams.append('name', this.applicationName);
        endpointUrl.searchParams.append('spyName', 'nodespy');
        endpointUrl.searchParams.append('until', dateToUnixTimestamp(profileExport.stoppedAt).toString());
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
        const processedProfile = processProfile(profile);
        const profileBuffer = await encode(processedProfile);
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
