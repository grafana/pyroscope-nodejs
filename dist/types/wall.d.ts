/// <reference types="node" />
export declare function isWallProfilingRunning(): boolean;
export declare function collectWall(seconds?: number): Promise<Buffer>;
export declare function startWallProfiling(): void;
export declare function stopWallProfiling(): void;
