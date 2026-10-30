import { state } from './state.js?v=1029.26-strawberry5';
import { BOOK_FILES, fetchRootText, loadBook } from '../../shared/vocabulary.js?v=1029.26-strawberry5';
import { launchToastAlert } from '../../shared/ui.js?v=1029.26-strawberry5';
import { renderInventoryTilesGrid } from './grid.js?v=1029.26-strawberry5';
import { resetOutputCodeState } from './selection.js?v=1029.26-strawberry5';
let bannerTimer;
export async function evaluateTeacherCredentials() {
    const passwordBox = document.getElementById('admin-passcode-box');
    const selectedBook = document.getElementById('login-book-selector').value;
    const plaintextPassword = passwordBox.value.trim();
    const errorBox = document.getElementById('login-error');
    const verifyButton = document.getElementById('verify-open-btn');
    errorBox.textContent = '';

    if (!['book_a','book_b'].includes(selectedBook)) {
        errorBox.textContent = 'Please select a valid book.';
        return;
    }
    if (!plaintextPassword) {
        errorBox.textContent = 'Please enter the system password.';
        passwordBox.focus();
        return;
    }

    verifyButton.disabled = true;
    verifyButton.textContent = 'Verifying…';
    try {
        const cpText = await fetchRootText('CP.txt');
        const allowedEncodedPasswords = cpText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        const encodedInput = btoa(unescape(encodeURIComponent(plaintextPassword)));

        if (!allowedEncodedPasswords.includes(encodedInput)) {
            errorBox.textContent = 'Invalid password. Access denied.';
            passwordBox.value = '';
            passwordBox.focus();
            return;
        }

        state.activeBook = selectedBook;
        state.activeFile = BOOK_FILES[state.activeBook];
        const gate = document.getElementById('login-shield-gate');
        if (await loadSelectedVocabularyFile()) {
            gate.style.opacity = '0';
            setTimeout(() => { gate.classList.add('is-hidden'); }, 300);
        }
    } catch (error) {
        console.error(error);
        errorBox.textContent = 'Unable to verify password. Check that CP.txt is available in the project root.';
    } finally {
        verifyButton.disabled = false;
        verifyButton.textContent = 'Verify & Open Test Generator';
    }
}
export async function loadSelectedVocabularyFile() {
    const banner = document.getElementById('status-message');
    clearTimeout(bannerTimer);
    banner.style.opacity = '1';
    banner.classList.remove('is-hidden');
    banner.textContent = 'Connecting to Vocabulary Records...';
    try {
        const records = await loadBook(state.activeBook);
        state.fullVocabularyInventory = records.filter(item => item.verified !== false && (state.activeBook !== 'book_b' || records.filter(other => other.number === item.number).length === 1));
        state.selected.clear();
        state.activeMatrixPage = 1;
        resetOutputCodeState();
        renderInventoryTilesGrid();
        banner.textContent = state.activeBook === 'book_b' ? state.fullVocabularyInventory.length + ' verified words available for Book B quizzes.' : records.length ? '✅ Success: Parsed ' + records.length + ' library records.' : '⚠️ No matching vocabulary format found.';
        if (state.activeBook === 'book_a' && records.length > 999) launchToastAlert('Quiz codes support book numbers 1–999. Later words are shown for reference.');
        if (records.length) {
            bannerTimer = setTimeout(() => {
                banner.style.opacity = '0';
                bannerTimer = setTimeout(() => banner.classList.add('is-hidden'), 500);
            }, 2500);
        }
        return true;
    } catch (error) {
        console.error(error);
        banner.textContent = '⚠️ Failed to read ' + state.activeFile + ' from the project root.';
        const gate = document.getElementById('login-shield-gate');
        gate.classList.remove('is-hidden');
        gate.style.opacity = '1';
        document.getElementById('login-error').textContent = 'Vocabulary file could not be loaded. Please try again.';
        return false;
    }
}
