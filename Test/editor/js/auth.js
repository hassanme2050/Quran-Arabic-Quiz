import { state } from './state.js?v=1029.26-editor9';
import { BOOK_FILES, fetchRootText } from '../../shared/vocabulary.js?v=1029.26-strawberry9';
import { initializeVocabularyDataStream } from './vocabulary.js?v=1029.26-editor9';
// Use the same configured passwords as the Test Generator. GitHub authorizes saves with the supplied token.
export async function evaluateAdministrativeCredentials() {
    const button = document.getElementById('verify-open-btn');
    if (button.disabled) return;
    const errorBox = document.getElementById('login-error');
    errorBox.textContent = '';
    const passwordBox = document.getElementById('admin-passcode-box');
    const tokenBox = document.getElementById('admin-token-box');
    const selectedBook = document.getElementById('login-book-selector').value;
    const plaintextPassword = passwordBox.value.trim();
    const inputToken = tokenBox.value.trim();

    if (!selectedBook || !BOOK_FILES[selectedBook]) {
        errorBox.textContent = 'Please select a valid book.';
        return;
    }

    if (!plaintextPassword || !inputToken) {
        errorBox.textContent = !plaintextPassword ? 'Please enter the system password.' : 'Please enter your GitHub token.';
        (!plaintextPassword ? passwordBox : tokenBox).focus();
        return;
    }
    button.disabled = true;
    button.textContent = 'Verifying…';
    try {
        const cpText = await fetchRootText('CP.txt');
        const configured = cpText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        if (!configured.length) {
            errorBox.textContent = 'No passwords are configured. Please check CP.txt.';
            return;
        }
        const encodedInput = btoa(Array.from(new TextEncoder().encode(plaintextPassword), byte => String.fromCharCode(byte)).join(''));
        if (!configured.includes(encodedInput)) {
            errorBox.textContent = 'Invalid password. Access denied.';
            passwordBox.value = '';
            passwordBox.focus();
            return;
        }
        state.token = inputToken;
        state.activeBook = selectedBook;
        state.activeFile = BOOK_FILES[state.activeBook];
        if (await initializeVocabularyDataStream()) {
            passwordBox.value = '';
            const gate = document.getElementById('login-shield-gate');
            gate.style.opacity = '0';
            setTimeout(() => gate.classList.add('hidden'), 300);
        } else {
            state.token = '';
            errorBox.textContent = 'Vocabulary file could not be loaded. Please try again.';
        }
    } catch {
        state.token = '';
        errorBox.textContent = 'Unable to verify password. Check that CP.txt is available in the project folder.';
    } finally {
        button.disabled = false;
        button.textContent = 'Verify & Open Editor';
    }
}
