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
  // eslint-disable-next-line @typescript-eslint/ban-types
  error(...args: Array<{}>): void
  // eslint-disable-next-line @typescript-eslint/ban-types
  trace(...args: Array<{}>): void
  // eslint-disable-next-line @typescript-eslint/ban-types
  debug(...args: Array<{}>): void
  // eslint-disable-next-line @typescript-eslint/ban-types
  info(...args: Array<{}>): void
  // eslint-disable-next-line @typescript-eslint/ban-types
  warn(...args: Array<{}>): void
  // eslint-disable-next-line @typescript-eslint/ban-types
  fatal(...args: Array<{}>): void
}

export class NullLogger implements Logger {
  // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-unused-vars
  info(...args: Array<{}>): void {
    return
  }
  // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-unused-vars
  error(...args: Array<{}>): void {
    return
  }
  // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-unused-vars
  trace(...args: Array<{}>): void {
    return
  }
  // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-unused-vars
  warn(...args: Array<{}>): void {
    return
  }
  // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-unused-vars
  fatal(...args: Array<{}>): void {
    return
  }
  // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-unused-vars
  debug(...args: Array<{}>): void {
    return
  }
}

export let logger = new NullLogger()

export function setLogger(newLogger: Logger): void {
  logger = newLogger
}
