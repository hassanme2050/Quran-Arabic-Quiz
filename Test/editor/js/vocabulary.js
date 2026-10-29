import { state } from './state.js?v=1029.26-strawberry1';
import { loadBook } from '../../shared/vocabulary.js?v=1029.26-strawberry1';
import { launchToastAlert } from '../../shared/ui.js?v=1029.26-strawberry1';
import { disableEditorControls, loadTargetInventoryRecord } from './records.js?v=1029.26-strawberry1';
export async function initializeVocabularyDataStream() {
    try {
        state.records = await loadBook(state.activeBook);
        state.loadedNumber = null;
        if (!state.records.length) {
            disableEditorControls();
            launchToastAlert('⚠️ Vocabulary file is empty or has no valid word = meaning rows.');
            return false;
        }
        const input = document.getElementById('word-target-index');
        input.disabled = false;
        input.max = state.records.length;
        input.value = 1;
        loadTargetInventoryRecord();
        launchToastAlert('✅ Loaded ' + state.records.length + ' total rows successfully.');
        return true;
    } catch (error) {
        console.error(error);
        disableEditorControls();
        launchToastAlert('⚠️ Failed to load ' + state.activeFile + ' from the project root.');
        const gate = document.getElementById('login-shield-gate');
        gate.classList.remove('hidden');
        gate.style.opacity = '1';
        return false;
    }
}
