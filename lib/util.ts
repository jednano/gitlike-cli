export function findFirst<T extends any>(
    haystack: { [key: string]: T; },
    predicate: (straw: T) => boolean,
) {
    const keys = Object.keys(haystack);
    for (let i = 0; i < keys.length; i++) {
        const straw = haystack[keys[i]];
        if (predicate(straw)) {
            return straw;
        }
    }
    return undefined;
}
