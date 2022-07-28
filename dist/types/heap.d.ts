/// <reference types="node" />
export declare function collectHeap(): Promise<Buffer>;
export declare function startHeapCollecting(): void;
export declare function startHeapProfiling(): void;
export declare function stopHeapCollecting(): void;
export declare function stopHeapProfiling(): void;
