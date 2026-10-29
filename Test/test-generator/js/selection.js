import { state } from './state.js?v=1029.26-strawberry1';
import { GENERATOR_QUESTION_COUNT as count, encodeQuizCode } from '../../shared/quiz-codes.js?v=1029.26-strawberry1';
import { launchToastAlert } from '../../shared/ui.js?v=1029.26-strawberry1';
export function resetOutputCodeState() {
    document.getElementById('quiz-code-output').value = '';
    document.getElementById('copy-code-btn').disabled = true;
}
export function updateStickyCounterBanner() {
    const picked = state.selected.size;
    const remaining = count - picked;
    const banner = document.getElementById('selection-counter-banner');
    banner.textContent = remaining > 0
        ? 'Please select exactly ' + count + ' words (' + remaining + ' remaining)'
        : '✅ ' + count + ' questions selected successfully!';
    document.getElementById('generate-code-btn').disabled = picked !== count;
}
export function toggleWordSelection(number, tile) {
    if (!Number.isInteger(number) || number < 1 || !(state.activeBook === 'book_b' ? state.fullVocabularyInventory.some(item => item.number === number && item.verified !== false) : number <= Math.min(999, state.fullVocabularyInventory.length))) return;
    if (state.selected.has(number)) state.selected.delete(number);
    else {
        if (state.selected.size >= count) {
            launchToastAlert('⚠️ Selection filled! You have already picked ' + count + ' questions.');
            return;
        }
        state.selected.add(number);
    }
    resetOutputCodeState();
    if (tile) {
        tile.classList.toggle('selected-state', state.selected.has(number));
        tile.setAttribute('aria-pressed', String(state.selected.has(number)));
    }
    updateStickyCounterBanner();
}
export function processSelectedHexadecimalQuizCode() {
    if (state.selected.size !== count) return;
    try {
        document.getElementById('quiz-code-output').value = encodeQuizCode([...state.selected], state.activeBook || 'book_a');
        document.getElementById('copy-code-btn').disabled = false;
        launchToastAlert('🎉 ' + count + '-question quiz code compiled successfully!');
    } catch (error) { launchToastAlert('⚠️ ' + error.message); }
}
export async function copyGeneratedCodeToClipboard() {
    const output = document.getElementById('quiz-code-output');
    if (!output.value) return;
    try {
        await navigator.clipboard.writeText(output.value);
        launchToastAlert('📋 Code copied to clipboard!');
    } catch {
        output.focus();
        output.select();
        launchToastAlert('⚠️ Clipboard unavailable. Copy the selected code manually.');
    }
}
