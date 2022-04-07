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
export declare function startCpuProfiling(tags?: TagList): void;
export declare function stopCpuProfiling(): Promise<void>;
export declare function startHeapProfiling(tags?: TagList): Promise<false | undefined>;
export declare function stopHeapProfiling(): void;
declare const _default: {
    init: typeof init;
    startCpuProfiling: typeof startCpuProfiling;
    stopCpuProfiling: typeof stopCpuProfiling;
    startHeapProfiling: typeof startHeapProfiling;
    stopHeapProfiling: typeof stopHeapProfiling;
};
export default _default;
