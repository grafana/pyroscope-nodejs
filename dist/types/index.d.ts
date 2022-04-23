import perftools from '@datadog/pprof/proto/profile';
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
export declare function startCpuProfiling(tags: Record<string, any>): void;
export declare function stopCpuProfiling(): void;
export declare function startWallProfiling(tags?: TagList): void;
export declare function stopWallProfiling(): Promise<void>;
export declare function startHeapProfiling(tags?: TagList): Promise<false | undefined>;
export declare function stopHeapProfiling(): void;
declare const _default: {
    init: typeof init;
    startCpuProfiling: typeof startCpuProfiling;
    stopCpuProfiling: typeof stopCpuProfiling;
    startWallProfiling: typeof startWallProfiling;
    stopWallProfiling: typeof stopWallProfiling;
    startHeapProfiling: typeof startHeapProfiling;
    stopHeapProfiling: typeof stopHeapProfiling;
};
export default _default;
