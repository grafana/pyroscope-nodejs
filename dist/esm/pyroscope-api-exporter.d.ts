import { ProfileExport, ProfileExporter } from './profile-exporter';
import { PyroscopeConfig } from './pyroscope-config';
export declare class PyroscopeApiExporter implements ProfileExporter {
    private readonly applicationName;
    private readonly authToken;
    private readonly serverAddress;
    private readonly config;
    constructor(applicationName: string, authToken: string | undefined, serverAddress: string, config: PyroscopeConfig);
    export(profileExport: ProfileExport): Promise<void>;
    private buildEndpointUrl;
    private buildRequestHeaders;
    private buildUploadProfileFormData;
    private handleAxiosError;
    private uploadProfile;
}
