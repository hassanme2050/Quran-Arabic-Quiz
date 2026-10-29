import { state } from './state.js';
import { bindActions } from '../../shared/ui.js';
import { evaluateTeacherCredentials } from './auth.js';
import { bindGridSelection, changeMatrixActivePage } from './grid.js';
import { processSelectedHexadecimalQuizCode, copyGeneratedCodeToClipboard, updateStickyCounterBanner } from './selection.js';
// Every page represents 50 consecutive book numbers, independent of viewport/zoom.
state.totalCardsPerPageLimit = 50;
bindActions({ evaluateTeacherCredentials, changeMatrixActivePage, processSelectedHexadecimalQuizCode, copyGeneratedCodeToClipboard });
bindGridSelection();
updateStickyCounterBanner();
const password = document.getElementById('admin-passcode-box');
password.addEventListener('keydown', event => { if (event.key === 'Enter') evaluateTeacherCredentials(); });
password.focus();
