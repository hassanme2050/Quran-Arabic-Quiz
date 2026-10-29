import { state } from './state.js?v=1029.26-editor3';
import { launchToastAlert } from '../../shared/ui.js?v=1029.26-strawberry1';
import { saveVocabularyRecord } from './github.js?v=1029.26-editor3';
import { refreshArabicFontControls } from './font.js?v=1029.26-editor3';
export async function saveWordUpdateToGitHub() {
    if (state.saving) return;
    const number = state.loadedNumber;
    const requested = Number(document.getElementById('word-target-index').value);
    if (!Number.isInteger(number) || number !== requested || !state.records[number - 1]) {
        launchToastAlert('⚠️ Load the requested book number with GO before saving.');
        return;
    }
    const updated = {
        word: document.getElementById('edit-arabic-field').value.trim(),
        meaning: document.getElementById('edit-meaning-field').value.trim()
    };
    if (!updated.word || !updated.meaning || /[\r\n=]/.test(updated.word) || /[\r\n]/.test(updated.meaning)) {
        launchToastAlert('⚠️ Both fields must contain one valid record.'); return;
    }
    if (!state.token) { launchToastAlert('❌ GitHub token is missing. Please log in again.'); return; }
    state.saving = true;
    const controls = ['word-target-index','lookup-go-btn','lookup-prev-btn','lookup-next-btn','edit-arabic-field','edit-meaning-field','commit-save-btn'];
    controls.forEach(id => { document.getElementById(id).disabled = true; });
    refreshArabicFontControls();
    launchToastAlert('⏳ Saving changes to GitHub...');
    try {
        await saveVocabularyRecord({ filename: state.activeFile, token: state.token, number, expected: state.records[number - 1], updated });
        state.records[number - 1] = updated;
        launchToastAlert('✅ Word #' + number + ' saved to GitHub!');
    } catch (error) {
        console.error('GitHub save error:', error);
        launchToastAlert('❌ Save failed: ' + error.message);
    } finally {
        state.saving = false;
        controls.forEach(id => { document.getElementById(id).disabled = false; });
        refreshArabicFontControls();
    }
}
