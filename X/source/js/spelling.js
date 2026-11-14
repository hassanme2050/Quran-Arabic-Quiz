import { state } from './state.js?v=1030.26-dates3';
import { activeBook } from './vocabulary.js?v=1030.26-dates3';
import { normalizeArabicAnswer, arabicAnswersMatch } from '../shared/spelling.js';
import { renderTajweedContext } from '../shared/tajweed.js?v=1030.26-dates3';
import { switchView } from './ui.js?v=1030.26-dates3';
import { displayQuizSummary } from './quiz.js?v=1030.26-dates3';

let submitted = false;
function render() {
    const item = state.sessionWords[state.currentIndex];
    if (!item) return;
    submitted = false;
    document.getElementById('spelling-counter').textContent =
        'Question ' + (state.currentIndex + 1) + ' of ' + state.sessionWords.length;
    renderTajweedContext(document.getElementById('spelling-context'), item);
    const prompt = document.getElementById('spelling-prompt');
    prompt.textContent = item.spellingPrompt;
    prompt.dir = activeBook === 'book_b' ? 'rtl' : 'ltr';
    prompt.lang = activeBook === 'book_b' ? 'ur' : 'en';
    const input = document.getElementById('spelling-answer');
    input.value = '';
    input.disabled = false;
    document.getElementById('spelling-feedback').textContent = '';
    const submit = document.getElementById('spelling-submit-button');
    submit.classList.remove('correct-choice', 'wrong-choice');
    submit.disabled = false;
    input.focus();
}
export function startSpellingSession() {
    state.quizHistory = [];
    document.getElementById('app-title').classList.remove('dictionary-title');
    document.getElementById('app-title').textContent = 'QuranFahm.app Spelling';
    document.getElementById('spelling-view').dataset.book = activeBook;
    switchView('spelling-view');
    render();
}
export function submitSpellingAnswer() {
    if (submitted || state.currentMode !== 'spelling' ||
        document.getElementById('spelling-view').classList.contains('hidden')) return;
    const item = state.sessionWords[state.currentIndex];
    if (!item) return;
    const input = document.getElementById('spelling-answer');
    const feedback = document.getElementById('spelling-feedback');
    const answer = input.value.trim();
    if (!normalizeArabicAnswer(answer)) {
        feedback.textContent = 'Type the Arabic word first.';
        input.focus();
        return;
    }
    const isCorrect = arabicAnswersMatch(answer, item.spellingAnswer);
    state.quizHistory.push({
        index: state.currentIndex + 1, word: item.spellingPrompt,
        chosen: answer, correct: item.spellingAnswer, isCorrect
    });
    submitted = true;
    input.disabled = true;
    feedback.textContent = '';
    const submit = document.getElementById('spelling-submit-button');
    submit.disabled = true;
    submit.classList.add(isCorrect ? 'correct-choice' : 'wrong-choice');
    state.answerTimer = setTimeout(() => {
        state.answerTimer = null;
        state.currentIndex++;
        if (state.currentIndex < state.sessionWords.length) render();
        else {
            document.getElementById('app-title').textContent = 'QuranFahm.app';
            displayQuizSummary();
        }
    }, 1200);
}
export function initializeSpelling() {
    document.getElementById('spelling-form').addEventListener('submit', event => {
        event.preventDefault();
        submitSpellingAnswer();
    });
}
