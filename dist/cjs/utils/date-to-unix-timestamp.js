"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dateToUnixTimestamp = void 0;
const MS_PER_SECOND = 1000;
function dateToUnixTimestamp(date) {
    return Math.floor(date.getTime() / MS_PER_SECOND);
}
exports.dateToUnixTimestamp = dateToUnixTimestamp;
