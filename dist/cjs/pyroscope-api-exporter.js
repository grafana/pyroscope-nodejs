"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PyroscopeApiExporter = void 0;
const node_url_1 = require("node:url");
const pprof_1 = require("@datadog/pprof");
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const date_to_unix_timestamp_1 = require("./utils/date-to-unix-timestamp");
const process_profile_1 = require("./utils/process-profile");
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
        endpointUrl.searchParams.append('from', (0, date_to_unix_timestamp_1.dateToUnixTimestamp)(profileExport.startedAt).toString());
        endpointUrl.searchParams.append('name', this.applicationName);
        endpointUrl.searchParams.append('spyName', 'nodespy');
        endpointUrl.searchParams.append('until', (0, date_to_unix_timestamp_1.dateToUnixTimestamp)(profileExport.stoppedAt).toString());
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
        const processedProfile = (0, process_profile_1.processProfile)(profile);
        const profileBuffer = await (0, pprof_1.encode)(processedProfile);
        const formData = new form_data_1.default();
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
            await (0, axios_1.default)(this.buildEndpointUrl(profileExport).toString(), {
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
exports.PyroscopeApiExporter = PyroscopeApiExporter;
