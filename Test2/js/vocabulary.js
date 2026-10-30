import { fetchRootText, parseVocabularyRecords, BOOK_FILES } from '../shared/vocabulary.js?v=1030.26-strawberry4';
import { parseLughatBook } from '../shared/lughat.js?v=1030.26-strawberry4';
import { parseTajweedBook } from '../shared/tajweed.js?v=1030.26-strawberry4';
import {parseQuranVocabulary} from '../shared/quran-vocabulary.js?v=1030.26-strawberry4';
import {cancelWordDetails} from './word-details.js?v=1030.26-strawberry4';
import { switchView, cancelPendingAnswer, clearQuizCodeError } from './ui.js?v=1030.26-strawberry4';
import {cancelQuizAttempt} from './quiz-attempt.js?v=1030.26-strawberry4';
export let vocabularyList = [];
export let dictionaryVocabularyList = [];
export let activeBook = 'book_a';
let loadSequence = 0;
export async function loadVocabulary(bookId = 'book_a') {
    const sequence = ++loadSequence;
    cancelPendingAnswer();
    cancelQuizAttempt();
    cancelWordDetails();
    vocabularyList = []; dictionaryVocabularyList = [];
    const status = document.getElementById('status-message');
    status.classList.remove('hidden'); status.textContent = 'Loading selected book...';
    setSessionAvailability(false);
    try {
        if (!Object.hasOwn(BOOK_FILES,bookId)) throw new Error('Unknown book.');
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
        const action=element.dataset.action;
        if (['triggerSelectedSession','startQuizWithCode','openQuest'].includes(action)) element.disabled = !available ||
            (action==='startQuizWithCode'&&activeBook==='book_c');
        if(action==='openDictionaryMode')element.disabled=activeBook==='book_c'||!dictionaryVocabularyList.length;
    });
}
export function parseVocabulary(text, bookId = 'book_a') {
    activeBook = bookId;
    const parsed = bookId === 'book_b' ? parseLughatBook(text) : bookId === 'book_c' ? parseTajweedBook(text) : bookId==='book_d'?parseQuranVocabulary(text):{records:parseVocabularyRecords(text), warnings:[]};
    dictionaryVocabularyList = parsed.records;
    vocabularyList = parsed.records.filter(item => item.verified !== false);
    const status = document.getElementById('status-message');
    status.classList.remove('hidden');
    status.textContent = bookId==='book_c'
        ? vocabularyList.length+' verified Tajweed questions for Quiz/Review; '+parsed.records.length+' in Dictionary.'+(parsed.hasBoundary?'':' No verification line found: Book C is dictionary-only.')
        : bookId === 'book_b'
        ? vocabularyList.length + ' verified words for Quiz/Review; ' + parsed.records.length + ' in Dictionary.' + (parsed.hasBoundary ? '' : ' No verification line found: Book B is dictionary-only.')
        : 'Loaded ' + vocabularyList.length + ' words';
    if (parsed.warnings.length) console.warn(bookId+':', ...parsed.warnings);
    status.textContent='✅ '+status.textContent;
    const first = document.getElementById('range-input-start'), last = document.getElementById('range-input-end');
    first.value = 1; last.value = bookId !== 'book_a' ? Math.max(0,...vocabularyList.map(item=>item.number)) : vocabularyList.length; first.max = last.max = last.value;
    document.getElementById('dictionary-view').dataset.book = bookId;
    document.getElementById('quiz-view').dataset.book = bookId;
    document.getElementById('flashcard-view').dataset.book = bookId;
    document.getElementById('quiz-finished-view').dataset.book = bookId;
    const meaningSort = document.getElementById('dict-sort-english');
    meaningSort.textContent = bookId === 'book_b' ? 'Urdu' : bookId==='book_c'?'Answer':'English';
    document.getElementById('dict-sort-arabic').textContent=bookId==='book_c'?'Question':'Arabic';
    document.getElementById('opt-all').textContent=bookId==='book_c'?'All Questions':'All Words';
    document.getElementById('opt-last').textContent=bookId==='book_c'?'Last 10':'Last 10 Words';
    document.getElementById('quiz-code-entry').classList.toggle('hidden',bookId==='book_c');
    document.getElementById('quiz-code-field').disabled=bookId==='book_c';
    setSessionAvailability(vocabularyList.length > 0);
    clearQuizCodeError();
    switchView('menu-view');
}
