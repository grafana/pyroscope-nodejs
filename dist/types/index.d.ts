/// <reference types="node" />
import perftools from 'pprof/proto/profile';
declare type TagList = Record<string, any>;
export interface PyroscopeConfig {
    server: string;
    name: string;
    sourceMapPath?: string[];
    autoStart: boolean;
    sm?: any;
    tags: TagList;
}
export declare function init(c?: PyroscopeConfig): void;
export declare const processProfile: (profile: perftools.perftools.profiles.IProfile) => perftools.perftools.profiles.IProfile | undefined;
export declare function collectCpu(seconds?: number): Promise<Buffer>;
export declare function startWallProfiling(tags?: TagList): void;
export declare function stopWallProfiling(): void;
export declare function startHeapProfiling(tags?: TagList): void;
export declare function stopHeapProfiling(): void;
declare const _default: {
    init: typeof init;
    startCpuProfiling: typeof startWallProfiling;
    stopCpuProfiling: typeof stopWallProfiling;
    startWallProfiling: typeof startWallProfiling;
    stopWallProfiling: typeof stopWallProfiling;
    startHeapProfiling: typeof startHeapProfiling;
    stopHeapProfiling: typeof stopHeapProfiling;
    collectCpu: typeof collectCpu;
};
export default _default;
