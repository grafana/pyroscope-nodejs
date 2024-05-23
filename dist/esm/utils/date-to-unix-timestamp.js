const MS_PER_SECOND = 1000;
export function dateToUnixTimestamp(date) {
    return Math.floor(date.getTime() / MS_PER_SECOND);
}
