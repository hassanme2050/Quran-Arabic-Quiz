import { state } from './state.js?v=1029.26-strawberry1';
import { BOOK_FILES } from '../../shared/vocabulary.js?v=1029.26-strawberry1';
import { launchToastAlert } from '../../shared/ui.js?v=1029.26-strawberry1';
import { initializeVocabularyDataStream } from './vocabulary.js?v=1029.26-strawberry1';
// Preserve the Editor's existing password rules; GitHub authorizes writes with the supplied token.
export async function evaluateAdministrativeCredentials() {
    const passwordBox = document.getElementById('admin-passcode-box');
    const tokenBox = document.getElementById('admin-token-box');
    const selectedBook = document.getElementById('login-book-selector').value;
    const plaintextPassword = passwordBox.value.trim();
    const inputToken = tokenBox.value.trim();

    if (!selectedBook || !BOOK_FILES[selectedBook]) {
        launchToastAlert("⚠️ Please select a valid book.");
        return;
    }

    if (!plaintextPassword || !inputToken) {
        launchToastAlert("⚠️ Both password and GitHub token fields are required.");
        return;
    }

    const clientGeneratedBase64 = btoa(plaintextPassword);
    const verifiedPayloadOptions = ["QWxsYWg=", "U2VjcmV0", "QWRtaW4="];

    if (!verifiedPayloadOptions.includes(clientGeneratedBase64)) {
        launchToastAlert("❌ Invalid administrative password access denied.");
        passwordBox.value = '';
        passwordBox.focus();
        return;
    }

    state.token = inputToken;
    state.activeBook = selectedBook;
    state.activeFile = BOOK_FILES[state.activeBook];

    const button = document.getElementById('verify-open-btn');
    button.disabled = true;
    try {
        if (await initializeVocabularyDataStream()) {
            const gate = document.getElementById('login-shield-gate');
            gate.style.opacity = '0';
            setTimeout(() => gate.classList.add('hidden'), 300);
        }
    } finally {
        button.disabled = false;
    }
}
