import { state } from './state.js';
import { activeBook } from './vocabulary.js';
import { normalizeArabicAnswer } from '../shared/book5.js';
import { switchView } from './ui.js';
import { displayQuizSummary } from './quiz.js?v=20261113-p2-r2';

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
    document.getElementById('spelling-submit-button').classList.remove('hidden');
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
    const isCorrect = normalizeArabicAnswer(answer) === normalizeArabicAnswer(item.word);
    state.quizHistory.push({
        index: state.currentIndex + 1,
        word: item.meaning,
        chosen: answer,
        correct: item.word,
        isCorrect
    });
    submitted = true;
    input.disabled = true;
    feedback.textContent = isCorrect ? 'Correct!' : 'Answer recorded. Review it with your score.';
    document.getElementById('spelling-submit-button').classList.add('hidden');
    const next = document.getElementById('spelling-next-button');
    next.classList.remove('hidden');
    next.focus();
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
