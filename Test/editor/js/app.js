import { bindActions } from '../../shared/ui.js?v=1029.26-strawberry1';
import { evaluateAdministrativeCredentials } from './auth.js?v=1029.26-editor2';
import { loadTargetInventoryRecord, navigateWord } from './records.js?v=1029.26-editor2';
import { saveWordUpdateToGitHub } from './save.js?v=1029.26-editor2';
bindActions({ loadTargetInventoryRecord, navigateWord: direction => navigateWord(Number(direction)), saveWordUpdateToGitHub });
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
