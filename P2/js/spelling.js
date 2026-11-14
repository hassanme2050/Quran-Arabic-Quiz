import { state } from './state.js';
import { activeBook } from './vocabulary.js';
import { normalizeArabicAnswer, arabicAnswersMatch } from '../shared/book5.js?v=20261114-p2-r5';
import { switchView } from './ui.js';
import { displayQuizSummary } from './quiz.js?v=20261114-p2-r5';

let submitted = false;
function render() {
    const item = state.sessionWords[state.currentIndex];
    if (!item) return;
    submitted = false;
    document.getElementById('spelling-counter').textContent =
        'Word ' + (state.currentIndex + 1) + ' of ' + state.sessionWords.length;
    document.getElementById('spelling-english-prompt').textContent = item.meaning;
    const input = document.getElementById('spelling-answer');
    input.value = '';
    input.disabled = false;
    document.getElementById('spelling-feedback').textContent = '';
    const submit = document.getElementById('spelling-submit-button');
    submit.classList.remove('hidden', 'correct-choice', 'wrong-choice');
    submit.disabled = false;
    const next = document.getElementById('spelling-next-button');
    next.classList.add('hidden');
    next.textContent = state.currentIndex === state.sessionWords.length - 1 ? 'See Score' : 'Next Word';
    input.focus();
}
export function startSpellingSession() {
    if (activeBook !== 'book_e' || !state.sessionWords.length) return;
    state.quizHistory = [];
    document.getElementById('app-title').textContent = 'QuranFahm.app Spelling';
    switchView('spelling-view');
    render();
}
export function submitSpellingAnswer() {
    if (submitted || state.currentMode !== 'spelling') return;
    const item = state.sessionWords[state.currentIndex];
    const input = document.getElementById('spelling-answer');
    const feedback = document.getElementById('spelling-feedback');
    const answer = input.value.trim();
    if (!normalizeArabicAnswer(answer)) {
        feedback.textContent = 'Type the Arabic word first.';
        input.focus();
        return;
    }
    const isCorrect = arabicAnswersMatch(answer, item.word);
    state.quizHistory.push({
        index: state.currentIndex + 1,
        word: item.meaning,
        chosen: answer,
        correct: item.word,
        isCorrect
    });
    submitted = true;
    input.disabled = true;
    feedback.textContent = '';
    const submit = document.getElementById('spelling-submit-button');
    submit.disabled = true;
    submit.classList.add(isCorrect ? 'correct-choice' : 'wrong-choice');
    state.answerTimer = setTimeout(() => {
        state.answerTimer = null;
        advanceSpelling();
    }, 1200);
}
export function advanceSpelling() {
    if (!submitted || state.currentMode !== 'spelling') return;
    submitted = false;
    state.currentIndex++;
    if (state.currentIndex < state.sessionWords.length) render();
    else {
        document.getElementById('app-title').textContent = 'QuranFahm.app';
        displayQuizSummary();
    }
}
