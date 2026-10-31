import { parseLughatBook } from './lughat.js?v=1030.26-dates3';
import { parseTajweedBook } from './tajweed.js?v=1030.26-dates3';
import {parseQuranVocabulary} from './quran-vocabulary.js?v=1030.26-dates3';
import {BOOK_FILES,libraryUrl} from './library-config.js?v=1030.26-dates3';
export {BOOK_FILES};
export function rootFileUrl(filename) {
    return libraryUrl(filename);
}
export async function fetchRootText(filename) {
    const response = await fetch(rootFileUrl(filename), { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not read ' + filename + ' (' + response.status + ').');
    return response.text();
}
export function parseVocabularyRecords(text) {
    // Book number is the one-based position of valid entries; never sort this array.
    return String(text).split(/\r?\n/).flatMap(line => {
        const separator = line.indexOf('=');
        if (separator < 0) return [];
        const word = line.slice(0, separator).trim();
        const meaning = line.slice(separator + 1).trim();
        return word && meaning ? [{ word, meaning }] : [];
    });
}
export async function loadBook(bookId) {
    const filename = BOOK_FILES[bookId];
    if (!filename) throw new Error('Unknown vocabulary book.');
    const text = await fetchRootText(filename);
    return bookId === 'book_b' ? parseLughatBook(text).records : bookId === 'book_c' ? parseTajweedBook(text).records : bookId==='book_d'?parseQuranVocabulary(text).records:parseVocabularyRecords(text);
}
