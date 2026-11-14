import { fetchRootText, parseVocabularyRecords, BOOK_FILES } from '../shared/vocabulary.js';
import { parseLughatBook } from '../shared/lughat.js';
import { parseBook5Records } from '../shared/book5.js';
import { switchView, cancelPendingAnswer, clearQuizCodeError } from './ui.js';
export let vocabularyList = [], dictionaryVocabularyList = [], activeBook = 'book_a', activeLevel = 1;
let allBook5Records = [], loadSequence = 0;
export async function loadVocabulary(bookId='book_a') {
 const sequence=++loadSequence; cancelPendingAnswer(); vocabularyList=[]; dictionaryVocabularyList=[];
 const status=document.getElementById('status-message'); status.classList.remove('hidden'); status.textContent='Loading selected book...'; setSessionAvailability(false);
 try { if(!['book_a','book_b','book_e'].includes(bookId)) throw new Error('Unknown book.'); const text=await fetchRootText(BOOK_FILES[bookId]); if(sequence!==loadSequence)return; parseVocabulary(text,bookId); }
 catch(error){ if(sequence!==loadSequence)return; status.textContent='Could not load selected book. Please select it again to retry.'; console.error(error); }
}
function setSessionAvailability(available){ document.querySelectorAll('[data-action]').forEach(el=>{if(['triggerSelectedSession','startQuizWithCode'].includes(el.dataset.action))el.disabled=!available;}); }
export function setActiveBook5Level(level){ activeLevel=Math.max(1,Math.min(4,Number(level)||1)); if(activeBook==='book_e') applyBook5Level(); }
function applyBook5Level(){ vocabularyList=allBook5Records.filter(item=>item.level===activeLevel); dictionaryVocabularyList=allBook5Records;
 const status=document.getElementById('status-message'); status.classList.remove('hidden'); status.textContent='Level '+activeLevel+' · '+(vocabularyList[0]?.levelLabel||'')+' · '+vocabularyList.length+' words loaded';
 const first=document.getElementById('range-input-start'), last=document.getElementById('range-input-end'); first.value=1; last.value=vocabularyList.at(-1)?.number||0; first.max=last.max=last.value;
 document.getElementById('dictionary-view').dataset.book='book_e'; document.getElementById('quiz-view').dataset.book='book_e'; document.getElementById('flashcard-view').dataset.book='book_e'; document.getElementById('quiz-finished-view').dataset.book='book_e'; setSessionAvailability(vocabularyList.length>0); clearQuizCodeError(); switchView('menu-view'); }
export function parseVocabulary(text,bookId='book_a'){
 activeBook=bookId; allBook5Records=[];
 if(bookId==='book_e'){const parsed=parseBook5Records(text);allBook5Records=parsed.records; if(parsed.warnings.length)console.warn('Book 5:',...parsed.warnings);applyBook5Level();return;}
 const parsed=bookId==='book_b'?parseLughatBook(text):{records:parseVocabularyRecords(text),warnings:[]}; dictionaryVocabularyList=parsed.records; vocabularyList=parsed.records.filter(item=>item.verified!==false);
 const status=document.getElementById('status-message');status.classList.remove('hidden');status.textContent=bookId==='book_b'?vocabularyList.length+' verified words for Quiz/Review; '+parsed.records.length+' in Dictionary.'+(parsed.hasBoundary?'':' No verification line found: Book B is dictionary-only.'):'Loaded '+vocabularyList.length+' words';
 if(parsed.warnings.length)console.warn('Book B:',...parsed.warnings);
 const first=document.getElementById('range-input-start'),last=document.getElementById('range-input-end');first.value=1;last.value=bookId==='book_b'?(vocabularyList.at(-1)?.number||0):vocabularyList.length;first.max=last.max=last.value;
 ['dictionary-view','quiz-view','flashcard-view','quiz-finished-view'].forEach(id=>document.getElementById(id).dataset.book=bookId);
 document.getElementById('dict-sort-english').textContent=bookId==='book_b'?'Urdu':'English';setSessionAvailability(vocabularyList.length>0);clearQuizCodeError();switchView('menu-view');
}
