import { state } from './state.js?v=1030.26-dates3';
import { bindActions } from '../../shared/ui.js?v=1030.26-dates3';
import { evaluateTeacherCredentials } from './auth.js?v=1030.26-dates3';
import { bindGridSelection, changeMatrixActivePage } from './grid.js?v=1030.26-dates3';
import { processSelectedHexadecimalQuizCode, copyGeneratedCodeToClipboard, updateStickyCounterBanner } from './selection.js?v=1030.26-dates3';
// Every page represents 50 consecutive book numbers, independent of viewport/zoom.
state.totalCardsPerPageLimit = 50;
bindActions({ evaluateTeacherCredentials, changeMatrixActivePage, processSelectedHexadecimalQuizCode, copyGeneratedCodeToClipboard });
bindGridSelection();
updateStickyCounterBanner();
const password = document.getElementById('admin-passcode-box');
password.addEventListener('keydown', event => { if (event.key === 'Enter') evaluateTeacherCredentials(); });
password.focus();
