import { Profile } from 'pprof-format';
export interface ProfileExport {
    profile: Profile;
    sampleRate?: number;
    startedAt: Date;
    stoppedAt: Date;
}
export interface ProfileExporter {
    export(profileExport: ProfileExport): Promise<void>;
}
