import { parseLughatBook } from './lughat.js?v=1029.26-strawberry7';
import { parseTajweedBook } from './tajweed.js?v=1029.26-strawberry7';
// The application root is resolved relative to this module, never to the page URL.
export const BOOK_FILES = Object.freeze({
    book_a: 'Vocabulary-File.txt',
    book_b: 'Lughat-AlQuran-word-meaning.txt',
    book_c: 'Tajweed-Question-Bank.txt'
});
export function rootFileUrl(filename) {
    return new URL('../' + filename, import.meta.url);
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
    return bookId === 'book_b' ? parseLughatBook(text).records : bookId === 'book_c' ? parseTajweedBook(text).records : parseVocabularyRecords(text);
}
