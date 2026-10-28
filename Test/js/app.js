import { state } from './state.js';
import { vocabularyList, loadVocabulary, activeBook } from './vocabulary.js';
import { shuffleArray, getRandomSubset } from './utils.js';
import { switchView, launchToastAlert, exitToHome, clearQuizCodeError, cancelPendingAnswer } from './ui.js';
import { showCard, handleEyeToggleIntercept, handleFlashCardBodyClick, handleCardProgression } from './flashcards.js?v=20261026-peaches2';
import { showQuizQuestion, startQuizWithCode, toggleSummaryTableVisibility } from './quiz.js';
import { openDictionaryMode, setDictionarySort, initializeDictionarySearch } from './dictionary.js?v=20261028-peaches-search1';
import { copyScreenshotToClipboard } from './platform.js';

// Both fields are normalized together, including swapped or out-of-bounds ranges.
export function normalizeCustomRange() {
    const count = activeBook === 'book_b' ? (vocabularyList.at(-1)?.number || 0) : vocabularyList.length;
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
        launchToastAlert('⚠️ Custom range requires at least ' + minimum + ' words. Adjusted automatically!');
    }
    first.value = start;
    last.value = end;
    first.max = last.max = count;
}
function validateLiveCustomBounds() { normalizeCustomRange(); }
function triggerSelectedSession(mode) {
    if (!vocabularyList.length) return;
    if (state.activeStrategySetting === 'custom') normalizeCustomRange();
    startSession(state.activeStrategySetting, mode);
}
export function updateSegmentSelection(targetStrategy) {
    state.activeStrategySetting = targetStrategy;
    const pill = document.getElementById('active-slider-pill');
    const optAll = document.getElementById('opt-all');
    const optLast = document.getElementById('opt-last');
    const optCustom = document.getElementById('opt-custom');
    const drawer = document.getElementById('range-drawer-box');
    
    optAll.classList.remove('active');
    optLast.classList.remove('active');
    optCustom.classList.remove('active');
    
    if (targetStrategy === 'all') {
        pill.style.transform = 'translateX(0%)';
        optAll.classList.add('active');
        drawer.classList.remove('open');
    } else if (targetStrategy === 'last') {
        pill.style.transform = 'translateX(100%)';
        optLast.classList.add('active');
        drawer.classList.remove('open');
    } else if (targetStrategy === 'custom') {
        pill.style.transform = 'translateX(200%)';
        optCustom.classList.add('active');
        drawer.classList.add('open');
        
        let startInp = document.getElementById('range-input-start');
        validateLiveCustomBounds(startInp, 'start');
    }
}

export function startSession(strategy, mode) {
    if (!vocabularyList.length) return;
    cancelPendingAnswer();
    state.currentMode = mode;
    state.quizHistory = [];
    
    document.getElementById('status-message').classList.add('hidden');
    
    if (strategy === 'all') {
        state.currentPool = [...vocabularyList];
        state.sessionWords = getRandomSubset(state.currentPool, 10);
    } else if (strategy === 'last') {
        state.currentPool = vocabularyList.slice(-10);
        state.sessionWords = [...state.currentPool];
        shuffleArray(state.sessionWords);
    } else if (strategy === 'custom') {
        let startIdx = parseInt(document.getElementById('range-input-start').value) - 1;
        let endIdx = parseInt(document.getElementById('range-input-end').value) - 1;
        state.currentPool = activeBook === 'book_b' ? vocabularyList.filter(item => item.number >= startIdx + 1 && item.number <= endIdx + 1) : vocabularyList.slice(startIdx, endIdx + 1);
        state.sessionWords = getRandomSubset(state.currentPool, 10);
    }

    state.currentIndex = 0;
    
    if (state.currentMode === 'flashcard') {
        document.getElementById('app-title').classList.remove('dictionary-title');
        document.getElementById('app-title').textContent = "Quran Arabic Flashcards";
        switchView('flashcard-view');
        
        const eyeNode = document.getElementById('card-eye-toggle');
        if (state.globalPersistentEyeToggleStatus) {
            eyeNode.classList.add('visible-state');
            eyeNode.setAttribute('title', 'Hide Meaning Permanently');
        } else {
            eyeNode.classList.remove('visible-state');
            eyeNode.setAttribute('title', 'Show Meaning Permanently');
        }
        
        showCard();
    } else {
        document.getElementById('app-title').classList.remove('dictionary-title');
        document.getElementById('app-title').textContent = "Quran Arabic Quiz";
        switchView('quiz-view');
        showQuizQuestion();
    }
}

function initializeApp() {
    initializeDictionarySearch();
    const actions = {
        updateSegmentSelection, validateLiveCustomBounds, triggerSelectedSession,
        startQuizWithCode, openDictionaryMode, setDictionarySort, exitToHome,
        handleFlashCardBodyClick, handleEyeToggleIntercept, handleCardProgression,
        toggleSummaryTableVisibility, copyScreenshotToClipboard
    };
    document.querySelectorAll('[data-action]').forEach(element => {
        element.addEventListener(element.dataset.event || 'click', event => {
            const action = actions[element.dataset.action];
            if (element.dataset.action === 'handleEyeToggleIntercept') action(event);
            else action(element.dataset.value);
        });
    });
    const input = document.getElementById('quiz-code-field');
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter') startQuizWithCode();
    });
    input.addEventListener('input', clearQuizCodeError);
    const selector = document.getElementById('vocabulary-book-selector');
    selector.addEventListener('change', () => { clearQuizCodeError(); loadVocabulary(selector.value); });
    loadVocabulary(selector.value || 'book_a');
}
initializeApp();
