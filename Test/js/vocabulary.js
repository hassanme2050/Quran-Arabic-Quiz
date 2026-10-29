import { fetchRootText, parseVocabularyRecords, BOOK_FILES } from '../shared/vocabulary.js?v=1029.26-strawberry1';
import { parseLughatBook } from '../shared/lughat.js?v=1029.26-strawberry1';
import { switchView, cancelPendingAnswer, clearQuizCodeError } from './ui.js?v=1029.26-strawberry1';
export let vocabularyList = [];
export let dictionaryVocabularyList = [];
export let activeBook = 'book_a';
let loadSequence = 0;
export async function loadVocabulary(bookId = 'book_a') {
    const sequence = ++loadSequence;
    cancelPendingAnswer();
    vocabularyList = []; dictionaryVocabularyList = [];
    const status = document.getElementById('status-message');
    status.classList.remove('hidden'); status.textContent = 'Loading selected book...';
    setSessionAvailability(false);
    try {
        if (!['book_a','book_b'].includes(bookId)) throw new Error('Unknown book.');
        const text = await fetchRootText(BOOK_FILES[bookId]);
        if (sequence !== loadSequence) return;
        parseVocabulary(text, bookId);
    } catch (error) {
        if (sequence !== loadSequence) return;
        status.textContent = 'Could not load selected book. Please select it again to retry.';
        console.error(error);
    }
}
function setSessionAvailability(available) {
    document.querySelectorAll('[data-action]').forEach(element => {
        if (['triggerSelectedSession','startQuizWithCode'].includes(element.dataset.action)) element.disabled = !available;
    });
}
export function parseVocabulary(text, bookId = 'book_a') {
    activeBook = bookId;
    const parsed = bookId === 'book_b' ? parseLughatBook(text) : {records:parseVocabularyRecords(text), warnings:[]};
    dictionaryVocabularyList = parsed.records;
    vocabularyList = parsed.records.filter(item => item.verified !== false);
    const status = document.getElementById('status-message');
    status.classList.remove('hidden');
    status.textContent = bookId === 'book_b'
        ? vocabularyList.length + ' verified words for Quiz/Review; ' + parsed.records.length + ' in Dictionary.' + (parsed.hasBoundary ? '' : ' No verification line found: Book B is dictionary-only.')
        : 'Loaded ' + vocabularyList.length + ' words';
    if (parsed.warnings.length) console.warn('Book B:', ...parsed.warnings);
    const first = document.getElementById('range-input-start'), last = document.getElementById('range-input-end');
    first.value = 1; last.value = bookId === 'book_b' ? (vocabularyList.at(-1)?.number || 0) : vocabularyList.length; first.max = last.max = last.value;
    document.getElementById('dictionary-view').dataset.book = bookId;
    document.getElementById('quiz-view').dataset.book = bookId;
    document.getElementById('flashcard-view').dataset.book = bookId;
    document.getElementById('quiz-finished-view').dataset.book = bookId;
    const meaningSort = document.getElementById('dict-sort-english');
    meaningSort.textContent = bookId === 'book_b' ? 'Urdu' : 'English';
    setSessionAvailability(vocabularyList.length > 0);
    clearQuizCodeError();
    switchView('menu-view');
}
