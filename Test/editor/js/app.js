import { bindActions } from '../../shared/ui.js';
import { evaluateAdministrativeCredentials } from './auth.js';
import { loadTargetInventoryRecord, navigateWord } from './records.js';
import { saveWordUpdateToGitHub } from './save.js';
bindActions({ evaluateAdministrativeCredentials, loadTargetInventoryRecord, navigateWord: direction => navigateWord(Number(direction)), saveWordUpdateToGitHub });
document.getElementById('word-target-index').addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); loadTargetInventoryRecord(); }
});
