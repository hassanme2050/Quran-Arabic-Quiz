import { state } from './state.js';
import { vocabularyList, loadVocabulary, activeBook, setActiveBook5Level } from './vocabulary.js';
import { shuffleArray, getRandomSubset } from './utils.js';
import { switchView, launchToastAlert, exitToHome, clearQuizCodeError, cancelPendingAnswer } from './ui.js';
import { showCard, handleEyeToggleIntercept, handleFlashCardBodyClick, handleCardProgression } from './flashcards.js';
import { showQuizQuestion, startQuizWithCode, toggleSummaryTableVisibility } from './quiz.js?v=20261114-p2-r5';
import { openDictionaryMode, setDictionarySort, initializeDictionarySearch } from './dictionary.js?v=20261114-p2-r5';
import { copyScreenshotToClipboard } from './platform.js';
import { startSpellingSession, submitSpellingAnswer, advanceSpelling } from './spelling.js?v=20261114-p2-r5';

export function normalizeCustomRange() {
    const count = ['book_b', 'book_e'].includes(activeBook)
        ? (vocabularyList.at(-1)?.number || 0) : vocabularyList.length;
    if (!count) return;
    const first = document.getElementById('range-input-start');
    const last = document.getElementById('range-input-end');
    const clamp = value => Math.max(1, Math.min(count, value));
    let start = clamp(parseInt(first.value, 10) || 1);
    let end = clamp(parseInt(last.value, 10) || count);
    if (start > end) [start, end] = [end, start];
    const minimum = Math.min(10, count);
    if (end - start + 1 < minimum) {
        end = Math.min(count, start + minimum - 1);
        start = Math.max(1, end - minimum + 1);
        launchToastAlert('Custom range requires at least ' + minimum + ' words.');
    }
    first.value = start;
    last.value = end;
    first.max = last.max = count;
}
function validateLiveCustomBounds() { normalizeCustomRange(); }
function triggerSelectedSession(mode) {
    if (!vocabularyList.length) return;
    if (state.activeStrategySetting === 'custom') normalizeCustomRange();
    const strategy = activeBook === 'book_e' && state.activeStrategySetting === 'last'
        ? 'round' : state.activeStrategySetting;
    startSession(strategy, mode);
}
function updateRoundDrawer(book = activeBook) {
    document.getElementById('book5-round-picker').classList.toggle('open',
        book === 'book_e' && state.activeStrategySetting === 'last');
}
export function updateSegmentSelection(strategy) {
    state.activeStrategySetting = strategy;
    ['all', 'last', 'custom'].forEach(name => {
        document.getElementById('opt-' + name).classList.toggle('active', strategy === name);
    });
    document.getElementById('active-slider-pill').style.transform =
        'translateX(' + ({ all: 0, last: 100, custom: 200 }[strategy] || 0) + '%)';
    document.getElementById('range-drawer-box').classList.toggle('open', strategy === 'custom');
    updateRoundDrawer();
    if (strategy === 'custom') normalizeCustomRange();
}
function chooseBook5Round(round) {
    state.activeRound = Math.max(1, Math.min(10, Number(round) || 1));
    document.getElementById('book5-round-select').value = state.activeRound;
}
export function startSession(strategy, mode) {
    if (!vocabularyList.length || (mode === 'spelling' && activeBook !== 'book_e')) return;
    cancelPendingAnswer();
    state.currentMode = mode;
    state.quizHistory = [];
    if (strategy === 'round' && activeBook === 'book_e') {
        const from = (state.activeRound - 1) * 10 + 1;
        state.currentPool = vocabularyList.filter(item => item.number >= from && item.number < from + 10);
        state.sessionWords = [...state.currentPool];
    } else if (strategy === 'last') {
        state.currentPool = vocabularyList.slice(-10);
        state.sessionWords = [...state.currentPool];
        shuffleArray(state.sessionWords);
    } else if (strategy === 'custom') {
        const from = Number(document.getElementById('range-input-start').value);
        const to = Number(document.getElementById('range-input-end').value);
        state.currentPool = ['book_b', 'book_e'].includes(activeBook)
            ? vocabularyList.filter(item => item.number >= from && item.number <= to)
            : vocabularyList.slice(from - 1, to);
        state.sessionWords = getRandomSubset(state.currentPool, 10);
    } else {
        state.currentPool = [...vocabularyList];
        state.sessionWords = getRandomSubset(state.currentPool, 10);
    }
    if (!state.sessionWords.length) return;
    state.currentIndex = 0;
    document.getElementById('status-message').classList.add('hidden');
    const title = document.getElementById('app-title');
    title.classList.remove('dictionary-title');
    if (mode === 'spelling') {
        startSpellingSession();
    } else if (mode === 'flashcard') {
        title.textContent = 'QuranFahm.app Flashcards';
        switchView('flashcard-view');
        const eye = document.getElementById('card-eye-toggle');
        eye.classList.toggle('visible-state', state.globalPersistentEyeToggleStatus);
        eye.setAttribute('title', state.globalPersistentEyeToggleStatus ? 'Hide Meaning Permanently' : 'Show Meaning Permanently');
        showCard();
    } else {
        title.textContent = 'QuranFahm.app';
        switchView('quiz-view');
        showQuizQuestion();
    }
}
function updateBookControls(id) {
    const isBookE = id === 'book_e';
    document.getElementById('book-level-submenu').classList.toggle('hidden', !isBookE);
    document.getElementById('spelling-mode-button').classList.toggle('hidden', !isBookE);
    document.getElementById('dictionary-mode-button').classList.toggle('hidden', isBookE);
    document.getElementById('quiz-code-group').classList.toggle('hidden', isBookE);
    document.getElementById('opt-last').textContent = isBookE ? '10 Words' : 'Last 10 Words';
    updateRoundDrawer(id);
    if (isBookE) {
        document.getElementById('book-level-select').value = '1';
        setActiveBook5Level(1);
        chooseBook5Round(1);
    }
}
function initializeApp() {
    initializeDictionarySearch();
    const actions = {
        updateSegmentSelection, validateLiveCustomBounds, triggerSelectedSession,
        startQuizWithCode, openDictionaryMode, setDictionarySort, exitToHome,
        handleFlashCardBodyClick, handleEyeToggleIntercept, handleCardProgression,
        toggleSummaryTableVisibility, copyScreenshotToClipboard,
        submitSpellingAnswer, advanceSpelling
    };
    document.querySelectorAll('[data-action]').forEach(element => {
        element.addEventListener(element.dataset.event || 'click', event => {
            const action = actions[element.dataset.action];
            if (!action) return;
            if (element.dataset.action === 'handleEyeToggleIntercept') action(event);
            else action(element.dataset.value);
        });
    });
    const input = document.getElementById('quiz-code-field');
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter') startQuizWithCode();
    });
    input.addEventListener('input', clearQuizCodeError);
    document.getElementById('book-level-select').addEventListener('change', event => {
        setActiveBook5Level(event.target.value);
        if (state.activeStrategySetting === 'custom') normalizeCustomRange();
    });
    document.getElementById('book5-round-select').addEventListener('change', event => {
        chooseBook5Round(event.target.value);
    });
    document.getElementById('spelling-answer').addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.isComposing) {
            event.preventDefault();
            submitSpellingAnswer();
        }
    });
    const selector = document.getElementById('vocabulary-book-selector');
    selector.addEventListener('change', () => {
        clearQuizCodeError();
        updateBookControls(selector.value);
        loadVocabulary(selector.value);
    });
    updateBookControls(selector.value || 'book_a');
    loadVocabulary(selector.value || 'book_a');
}
initializeApp();
