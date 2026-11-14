// Browser preferences only; no quiz answers or progress are stored here.
const key = 'quranfahm.preferences.v1:' + new URL('../', import.meta.url).pathname;
export function readPreferences() {
    try {
        const value = JSON.parse(globalThis.localStorage.getItem(key));
        if (!value || typeof value !== 'object') return {};
        const integer = (n, min, max, fallback) => Number.isInteger(n) && n >= min && n <= max ? n : fallback;
        return {
            book: ['book_a', 'book_b', 'book_e'].includes(value.book) ? value.book : 'book_a',
            level: integer(value.level, 1, 4, 1),
            round: integer(value.round, 1, 10, 1),
            strategy: ['all', 'last', 'custom'].includes(value.strategy) ? value.strategy : 'all',
            from: integer(value.from, 1, 99999, 1),
            to: integer(value.to, 1, 99999, 10)
        };
    } catch { return {}; }
}
export function writePreferences(value) {
    try { globalThis.localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* Browsers that block storage can still use the app normally. */ }
}
