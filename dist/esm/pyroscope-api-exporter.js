import { URL } from 'node:url';
import { encode } from '@datadog/pprof';
import axios from 'axios';
import FormData from 'form-data';
import { dateToUnixTimestamp } from './utils/date-to-unix-timestamp';
import { processProfile } from './utils/process-profile';
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
    buildRequestHeaders(formData) {
        const headers = formData.getHeaders();
        if (this.authToken !== undefined) {
            headers['authorization'] = `Bearer ${this.authToken}`;
        }
        if (this.config.tenantID) {
            headers['X-Scope-OrgID'] = this.config.tenantID;
        }
        return headers;
    }
    async buildUploadProfileFormData(profile) {
        const processedProfile = processProfile(profile);
        const profileBuffer = await encode(processedProfile);
        const formData = new FormData();
        formData.append('profile', profileBuffer, {
            contentType: 'text/json',
            filename: 'profile',
            knownLength: profileBuffer.byteLength,
        });
        return formData;
    }
    handleAxiosError(error) {
        if (error.response !== undefined) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            log('Pyroscope received error while ingesting data to server');
            log(error.response.data);
        }
        else if (error.request !== undefined) {
            // The request was made but no response was received
            // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
            // http.ClientRequest in node.js
            log('Error when ingesting data to server:', error.message);
        }
        else {
            // Something happened in setting up the request that triggered an Error
            log('Error', error.message);
        }
    }
    async uploadProfile(profileExport) {
        const formData = await this.buildUploadProfileFormData(profileExport.profile);
        const auth = this.config.basicAuthUser && this.config.basicAuthPassword
            ? {
                username: this.config.basicAuthUser,
                password: this.config.basicAuthPassword,
            }
            : undefined;
        try {
            await axios(this.buildEndpointUrl(profileExport).toString(), {
                data: formData,
                headers: this.buildRequestHeaders(formData),
                method: 'POST',
                auth: auth,
            });
        }
        catch (error) {
            this.handleAxiosError(error);
        }
    }
}
