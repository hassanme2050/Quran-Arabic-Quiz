import { BOOK_IDS } from '../shared/dashboard-settings.js';

// This preference belongs to this browser; it never changes shared Admin settings.
const KEY = 'quranaq.dates.selected-book.v1';
export function readSelectedBook() {
    try {
        const book = localStorage.getItem(KEY);
        return BOOK_IDS.includes(book) ? book : '';
    } catch {
        return '';
    }
}
export function rememberSelectedBook(book) {
    if (!BOOK_IDS.includes(book)) return;
    try { localStorage.setItem(KEY, book); }
    catch { /* Continue normally when browser storage is unavailable. */ }
}
