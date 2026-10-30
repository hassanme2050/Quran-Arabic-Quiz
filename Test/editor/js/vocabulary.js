import { state } from './state.js?v=1029.26-editor8';
import { fetchRootText } from '../../shared/vocabulary.js?v=1029.26-strawberry8';
import {parseEditorBook,recordNumber} from './book.js?v=1029.26-editor8';
import { launchToastAlert } from '../../shared/ui.js?v=1029.26-strawberry8';
import { disableEditorControls, loadTargetInventoryRecord } from './records.js?v=1029.26-editor8';
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
        const bookB=state.activeBook==='book_b',bookC=state.activeBook==='book_c';
        document.getElementById('word-editor').dataset.book=state.activeBook;
        document.getElementById('editor-title').textContent=bookC?'Tajweed Question Editor':'Word Editor';
        document.getElementById('target-number-label').textContent=bookC?'Target Question Number':'Target Word Number';
        document.getElementById('word-field-label').textContent=bookC?'Question':'Arabic Word';
        document.getElementById('word-field-label').setAttribute('for',bookC?'edit-question-field':'edit-arabic-field');
        document.getElementById('edit-arabic-field').classList.toggle('hidden',bookC);
        document.getElementById('edit-question-field').classList.toggle('hidden',!bookC);
        document.getElementById('editor-wrong-answers').classList.toggle('hidden',!bookC);
        document.getElementById('editor-question-context').classList.toggle('hidden',!bookC);
        document.getElementById('publish-words-btn').classList.remove('hidden');
        document.getElementById('availability-help').classList.remove('hidden');
        document.getElementById('availability-help').textContent=bookC?'Save corrections first. Make available places ----- immediately after the current question, before the next question. If the marker is already there or farther ahead, nothing changes.':'For Book B, save corrections first. Make available places ----- immediately after the current word, before the next word. If the marker is already there or farther ahead, nothing changes.';
        document.getElementById('meaning-field-label').textContent=bookC?'Correct answer':bookB?'Urdu Meaning / Notes':'English Translation Meaning';
        const meaning=document.getElementById('edit-meaning-field');
        meaning.dir=bookB?'rtl':'auto';meaning.lang=bookB?'ur':'en';
        meaning.setAttribute('aria-label',bookC?'Correct answer':bookB?'Urdu meaning and notes':'English translation meaning');
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
