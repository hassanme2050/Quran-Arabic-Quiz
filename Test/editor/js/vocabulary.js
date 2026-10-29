import { state } from './state.js?v=1029.26-editor6';
import { fetchRootText } from '../../shared/vocabulary.js?v=1029.26-strawberry1';
import {parseEditorBook,recordNumber} from './book.js?v=1029.26-editor6';
import { launchToastAlert } from '../../shared/ui.js?v=1029.26-strawberry1';
import { disableEditorControls, loadTargetInventoryRecord } from './records.js?v=1029.26-editor6';
export async function initializeVocabularyDataStream() {
    state.loadedIndex=null;state.loadedNumber=null;state.records=[];
    disableEditorControls();
    try {
        const parsed=parseEditorBook(await fetchRootText(state.activeFile),state.activeBook);
        state.records=parsed.records;state.availableThrough=parsed.availableThrough;state.availableCount=parsed.availableCount;
        if (!state.records.length) {
            disableEditorControls();
            launchToastAlert('⚠️ Vocabulary file is empty or has no valid word = meaning rows.');
            return false;
        }
        const input = document.getElementById('word-target-index');
        input.disabled = false;
        input.max = Math.max(...state.records.map(recordNumber));
        input.value = recordNumber(state.records[0],0);
        const bookB=state.activeBook==='book_b';
        document.getElementById('word-editor').dataset.book=state.activeBook;
        document.getElementById('meaning-field-label').textContent=bookB?'Urdu Meaning / Notes':'English Translation Meaning';
        const meaning=document.getElementById('edit-meaning-field');
        meaning.dir=bookB?'rtl':'ltr';meaning.lang=bookB?'ur':'en';
        meaning.setAttribute('aria-label',bookB?'Urdu meaning and notes':'English translation meaning');
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
