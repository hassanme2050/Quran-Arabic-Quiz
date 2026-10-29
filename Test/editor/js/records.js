import { state } from './state.js?v=1029.26-editor3';
import { launchToastAlert } from '../../shared/ui.js?v=1029.26-strawberry1';
import { refreshArabicFontControls } from './font.js?v=1029.26-editor3';
export function disableEditorControls() {
    document.getElementById('word-target-index').disabled = true;
    document.getElementById('lookup-go-btn').disabled = true;
    document.getElementById('lookup-prev-btn').disabled = true;
    document.getElementById('lookup-next-btn').disabled = true;
    document.getElementById('edit-arabic-field').disabled = true;
    document.getElementById('edit-meaning-field').disabled = true;
    document.getElementById('commit-save-btn').disabled = true;
    refreshArabicFontControls();
}

export function hasUnsavedEdits() {
    if (state.loadedNumber === null) return false;
    const originalRecord = state.records[state.loadedNumber - 1];
    if (!originalRecord) return false;
    return document.getElementById('edit-arabic-field').value !== originalRecord.word ||
           document.getElementById('edit-meaning-field').value !== originalRecord.meaning;
}

export function loadTargetInventoryRecord() {
    if (state.saving) return;
    if (state.records.length === 0) {
        launchToastAlert("⚠️ No vocabulary records are loaded.");
        return;
    }

    const targetInput = document.getElementById('word-target-index');
    let indexPointer = parseInt(targetInput.value, 10) || 1;

    if (indexPointer < 1) indexPointer = 1;
    if (indexPointer > state.records.length) indexPointer = state.records.length;

    if (state.loadedNumber !== null && hasUnsavedEdits()) {
        const shouldDiscard = window.confirm("You have unsaved edits. Discard them and move to another word?");
        if (!shouldDiscard) {
            targetInput.value = state.loadedNumber;
            return;
        }
    }

    targetInput.value = indexPointer;

    const activeRecord = state.records[indexPointer - 1];
    if (!activeRecord) {
        launchToastAlert("⚠️ That word number could not be found.");
        return;
    }

    document.getElementById('edit-arabic-field').value = activeRecord.word;
    document.getElementById('edit-meaning-field').value = activeRecord.meaning;
    document.getElementById('edit-arabic-field').disabled = false;
    document.getElementById('edit-meaning-field').disabled = false;
    document.getElementById('commit-save-btn').disabled = false;
    state.loadedNumber = indexPointer;

    // Keep Previous/Next enabled; navigation clamps to the first/last record.
    document.getElementById('lookup-go-btn').disabled = false;
    document.getElementById('lookup-prev-btn').disabled = false;
    document.getElementById('lookup-next-btn').disabled = false;
    refreshArabicFontControls();
}

export function navigateWord(direction) {
    if (state.saving || state.records.length === 0) return;
    const targetInput = document.getElementById('word-target-index');
    const current = parseInt(targetInput.value, 10) || 1;
    const next = Math.max(1, Math.min(state.records.length, current + direction));
    targetInput.value = next;
    loadTargetInventoryRecord();
}
