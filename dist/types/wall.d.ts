/// <reference types="node" />
import { perftools } from '@datadog/pprof/proto/profile';
export declare function isWallProfilingRunning(): boolean;
export declare function collectWall(seconds?: number): Promise<Buffer>;
export declare function processCpuProfile(profile?: perftools.profiles.IProfile): perftools.profiles.IProfile;
export declare function startWallProfiling(): void;
export declare function stopWallProfiling(): void;
