/// <reference types="node" />
export declare function startCpuProfiling(): void;
export declare function stopCpuCollecting(): void;
export declare function stopCpuProfiling(): void;
export declare function setCpuLabels(labels: Record<string, unknown>): void;
export declare function getCpuLabels(): unknown;
export declare function tag(key: string, value: number | string | undefined): void;
export declare function collectCpu(seconds: number): Promise<Buffer>;
export declare function tagWrapper(key: string, value: string | undefined, fn: () => void, ...args: unknown[]): void;
