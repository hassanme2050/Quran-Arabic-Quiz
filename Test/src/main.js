import { state } from './state.js';
import { showToast } from './utils.js';
import { decodeTeacherQuizCode, loadVocabulary, parseVocabulary, switchView } from './vocabulary.js';
import { updateSegmentSelection, triggerSelectedSession, startSession, showCard, handleEyeToggleIntercept, handleFlashCardBodyClick, handleCardProgression, exitToHome, showQuizQuestion, evaluateQuizAnswer } from './quiz.js';

function clearQuizCodeError() {
    const errorBox = document.getElementById('quiz-code-error');
    if (!errorBox) return;
    errorBox.textContent = '';
    errorBox.classList.add('hidden');
}

function showQuizCodeError(message) {
    const errorBox = document.getElementById('quiz-code-error');
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.classList.remove('hidden');
}

export function startQuizWithCode() {
    const input = document.getElementById('quiz-code-field');
    const enteredCode = input.value.trim().toUpperCase().replace(/\s+/g, '');
    clearQuizCodeError();

    if (state.vocabularyList.length === 0) {
        showQuizCodeError('Vocabulary is not loaded yet. Please wait and try again.');
        return;
    }

    const selectedQuestionNumbers = enteredCode ? decodeTeacherQuizCode(enteredCode) : null;
    if (!selectedQuestionNumbers) {
        showQuizCodeError('Invalid quiz code. Please try again or check with your teacher.');
        input.focus();
        return;
    }

    const selectedWords = [];
    for (const questionNumber of selectedQuestionNumbers) {
        if (!Number.isInteger(questionNumber) || questionNumber < 1 || questionNumber > state.vocabularyList.length) {
            showQuizCodeError('This quiz code is not available with the current vocabulary file. Please check with your teacher.');
            return;
        }
        selectedWords.push(state.vocabularyList[questionNumber - 1]);
    }

    if (selectedWords.length === 0) {
        showQuizCodeError('This quiz has no questions assigned. Please check with your teacher.');
        return;
    }

    state.sessionWords = [...selectedWords];
    state.sessionWords.sort(() => Math.random() - 0.5);
    state.currentPool = [...state.vocabularyList];
    state.currentMode = 'quiz';
    state.currentIndex = 0;
    state.quizHistory = [];

    document.getElementById('status-message').classList.add('hidden');
    document.getElementById('app-title').textContent = 'Quran Arabic Quiz';
    switchView('quiz-view');
    showQuizQuestion();
}

function bindGlobalEvents() {
    document.getElementById('opt-all').addEventListener('click', () => updateSegmentSelection('all'));
    document.getElementById('opt-last').addEventListener('click', () => updateSegmentSelection('last'));
    document.getElementById('opt-custom').addEventListener('click', () => updateSegmentSelection('custom'));
    document.getElementById('range-input-start').addEventListener('change', validateLiveCustomBounds);
    document.getElementById('range-input-end').addEventListener('change', validateLiveCustomBounds);
    document.getElementById('quiz-code-field').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') startQuizWithCode();
    });
    document.getElementById('quiz-code-field').addEventListener('input', clearQuizCodeError);
    document.getElementById('quiz-code-btn').addEventListener('click', startQuizWithCode);

    document.querySelectorAll('[data-action="start-flashcard"]').forEach(button => {
        button.addEventListener('click', () => triggerSelectedSession('flashcard'));
    });
    document.querySelectorAll('[data-action="start-quiz"]').forEach(button => {
        button.addEventListener('click', () => triggerSelectedSession('quiz'));
    });
    document.querySelectorAll('[data-action="exit-home"]').forEach(button => {
        button.addEventListener('click', () => {
            document.getElementById('app-title').textContent = 'Quran Arabic Quiz';
            document.getElementById('status-message').classList.remove('hidden');
            switchView('menu-view');
        });
    });

    document.getElementById('card-action-btn').addEventListener('click', handleCardProgression);
    document.getElementById('review-card-frame').addEventListener('click', handleFlashCardBodyClick);
    document.getElementById('card-eye-toggle').addEventListener('click', handleEyeToggleIntercept);
    document.getElementById('toggle-table-btn').addEventListener('click', () => {
        const table = document.getElementById('summary-table-container');
        table.classList.toggle('hidden');
        const button = document.getElementById('toggle-table-btn');
        button.textContent = table.classList.contains('hidden') ? '📊 Show Performance Summary' : '📊 Hide Performance Summary';
    });
    document.querySelectorAll('[data-action="copy-screenshot"]').forEach(button => {
        button.addEventListener('click', () => showToast('Screenshot action placeholder. Add your clipboard logic here.'));
    });
}

function validateLiveCustomBounds() {
    if (state.vocabularyList.length === 0) return;
    const startInp = document.getElementById('range-input-start');
    const endInp = document.getElementById('range-input-end');
    const startVal = parseInt(startInp.value, 10);
    const endVal = parseInt(endInp.value, 10);

    if (Number.isNaN(startVal) || startVal < 1) {
        startInp.value = 1;
        showToast('⚠️ Range must start at 1. Corrected automatically!');
        return;
    }

    if (Number.isNaN(endVal) || endVal > state.vocabularyList.length) {
        endInp.value = state.vocabularyList.length;
        showToast('⚠️ Range cannot exceed ' + state.vocabularyList.length + ' words. Corrected automatically!');
    }
}

export function initApp() {
    bindGlobalEvents();
    loadVocabulary();
}
