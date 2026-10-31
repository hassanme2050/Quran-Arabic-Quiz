import { bindActions } from '../../shared/ui.js?v=1030.26-strawberry7';
import { evaluateAdministrativeCredentials } from './auth.js?v=1030.26-editor5';
import { loadTargetInventoryRecord, navigateWord } from './records.js?v=1030.26-editor5';
import { saveWordUpdateToGitHub, makeWordsAvailable } from './save.js?v=1030.26-editor5';
bindActions({ loadTargetInventoryRecord, navigateWord: direction => navigateWord(Number(direction)), saveWordUpdateToGitHub, makeWordsAvailable });
const requestedBook=new URLSearchParams(window.location?.search||'').get('book');
if(['book_a','book_b','book_c','book_d'].includes(requestedBook))document.getElementById('login-book-selector').value=requestedBook;
document.getElementById('editor-login-form').addEventListener('submit', event => {
    event.preventDefault();
    evaluateAdministrativeCredentials();
});
document.getElementById('word-target-index').addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); loadTargetInventoryRecord(); }
});
const verifyButton = document.getElementById('verify-open-btn');
verifyButton.textContent = 'Verify & Open Editor';
verifyButton.disabled = false;
