import { state } from './state.js?v=1029.26-strawberry9';
import { bindActions } from '../../shared/ui.js?v=1029.26-strawberry9';
import { evaluateTeacherCredentials } from './auth.js?v=1029.26-strawberry9';
import { bindGridSelection, changeMatrixActivePage } from './grid.js?v=1029.26-strawberry9';
import { processSelectedHexadecimalQuizCode, copyGeneratedCodeToClipboard, updateStickyCounterBanner } from './selection.js?v=1029.26-strawberry9';
// Every page represents 50 consecutive book numbers, independent of viewport/zoom.
state.totalCardsPerPageLimit = 50;
bindActions({ evaluateTeacherCredentials, changeMatrixActivePage, processSelectedHexadecimalQuizCode, copyGeneratedCodeToClipboard });
bindGridSelection();
updateStickyCounterBanner();
const password = document.getElementById('admin-passcode-box');
password.addEventListener('keydown', event => { if (event.key === 'Enter') evaluateTeacherCredentials(); });
password.focus();
