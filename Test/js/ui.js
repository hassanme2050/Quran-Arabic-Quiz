export { launchToastAlert } from '../shared/ui.js?v=1029.26-strawberry1';
import { state } from './state.js?v=1029.26-strawberry1';
const views = ['menu-view', 'flashcard-view', 'quiz-view', 'quiz-finished-view', 'review-finished-view', 'dictionary-view', 'quest-map-view', 'quest-review-view', 'quest-quiz-view', 'quest-result-view'];
export function switchView(viewId) {
  for (const id of views) document.getElementById(id).classList.toggle('hidden', id !== viewId);
}
export function clearQuizCodeError() {
  const box = document.getElementById('quiz-code-error');
  box.textContent = '';
  box.classList.add('hidden');
}
export function showQuizCodeError(message) {
  const box = document.getElementById('quiz-code-error');
  box.textContent = message;
  box.classList.remove('hidden');
}
export function cancelPendingAnswer() {
  clearTimeout(state.answerTimer);
  state.answerTimer = null;
}
export function exitToHome() {
  cancelPendingAnswer();
  document.getElementById('app-title').classList.remove('dictionary-title');
  document.getElementById('app-title').textContent = 'Quran Arabic Quiz';
  document.getElementById('status-message').classList.remove('hidden');
  clearQuizCodeError();
  switchView('menu-view');
}
