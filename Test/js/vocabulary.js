import { fetchRootText, parseVocabularyRecords } from '../shared/vocabulary.js';
import { switchView } from './ui.js';
export let vocabularyList = [];
// Fetch fresh data each visit; sorted dictionary caches live only in this page.
export async function loadVocabulary() {
  try {
    parseVocabulary(await fetchRootText('Vocabulary-File.txt'));
  } catch (error) {
    console.error(error);
    document.getElementById('status-message').textContent = '⚠️ Failed to read Vocabulary-File.txt. Check folder files.';
  }
}
export function parseVocabulary(text) {
    if (!text) {
        document.getElementById('status-message').textContent = '⚠️ Vocabulary-File.txt is empty.';
        return;
    }

    vocabularyList = parseVocabularyRecords(text);

    if (vocabularyList.length === 0) {
        document.getElementById('status-message').textContent = '⚠️ Loaded file, but found no matching "word = meaning" formats.';
    } else {
        document.getElementById('status-message').textContent = '✅ Success: Loaded ' + vocabularyList.length + ' total words';
        
        document.getElementById('range-input-start').value = 1;
        document.getElementById('range-input-end').value = vocabularyList.length;
        document.getElementById('range-input-end').max = vocabularyList.length;
        
        switchView('menu-view');
    }
}
