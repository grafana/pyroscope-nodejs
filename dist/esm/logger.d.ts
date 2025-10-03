/**
 * Copyright 2024 Datadog Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
export interface Logger {
    error(...args: Array<{}>): void;
    trace(...args: Array<{}>): void;
    debug(...args: Array<{}>): void;
    info(...args: Array<{}>): void;
    warn(...args: Array<{}>): void;
    fatal(...args: Array<{}>): void;
}
export declare class NullLogger implements Logger {
    info(...args: Array<{}>): void;
    error(...args: Array<{}>): void;
    trace(...args: Array<{}>): void;
    warn(...args: Array<{}>): void;
    fatal(...args: Array<{}>): void;
    debug(...args: Array<{}>): void;
}
export declare let logger: NullLogger;
export declare function setLogger(newLogger: Logger): void;
