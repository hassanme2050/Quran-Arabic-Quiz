import {state} from './state.js?v=1029.26-editor6';
import {launchToastAlert} from '../../shared/ui.js?v=1029.26-strawberry1';
import {editableMeaning,recordNumber,parseEditorBook,matchingRecordIndex} from './book.js?v=1029.26-editor6';

const byId=id=>document.getElementById(id);
const controls=['word-target-index','lookup-go-btn','lookup-prev-btn','lookup-next-btn','edit-arabic-field','edit-meaning-field','commit-save-btn','publish-words-btn'];
export function refreshRecordStatus(locked=false) {
    const bookB=state.activeBook==='book_b',index=state.loadedIndex,record=state.records[index];
    byId('editor-availability-status').textContent=!bookB?'Select Book B at login to manage its ----- marker.':state.availableCount
        ?'----- is after word '+state.availableThrough+' ('+state.availableCount+' entries available to students).':'No words are available to students yet.';
    byId('publish-words-btn').textContent='Make available';
    byId('publish-words-btn').disabled=locked||state.saving||!bookB||!record;
    if(!record){byId('editor-record-status').textContent='';return;}
    const duplicates=bookB?state.records.filter(item=>item.number===record.number).length:1;
    byId('editor-record-status').textContent='Entry '+(index+1)+' of '+state.records.length+
        (duplicates>1?' · Word '+record.number+', occurrence '+record.occurrence+' of '+duplicates:'');
}
export function setEditorLocked(locked) {
    controls.forEach(id=>{byId(id).disabled=locked;});
    refreshRecordStatus(locked);
}
export function disableEditorControls(){setEditorLocked(true);}
export function hasUnsavedEdits() {
    const record=state.records[state.loadedIndex];
    return !!record&&(byId('edit-arabic-field').value!==record.word||byId('edit-meaning-field').value!==editableMeaning(record));
}
function showRecord(index,checkEdits=true) {
    if(state.saving)return;
    const record=state.records[index];if(!record)return;
    if(checkEdits&&hasUnsavedEdits()&&!window.confirm('You have unsaved edits. Discard them and move to another word?')) {
        byId('word-target-index').value=state.loadedNumber;return;
    }
    state.loadedIndex=index;state.loadedNumber=recordNumber(record,index);
    byId('word-target-index').value=state.loadedNumber;
    byId('edit-arabic-field').value=record.word;
    byId('edit-meaning-field').value=editableMeaning(record);
    setEditorLocked(false);
}
export function loadTargetInventoryRecord() {
    if(state.saving)return;
    if(!state.records.length){launchToastAlert('No vocabulary records are loaded.');return;}
    const input=byId('word-target-index'),maximum=Math.max(...state.records.map(recordNumber));
    const number=Math.max(1,Math.min(maximum,parseInt(input.value,10)||1));
    const current=state.records[state.loadedIndex];
    const index=current&&state.loadedNumber===number?state.loadedIndex:
        state.records.findIndex((record,i)=>recordNumber(record,i)===number);
    if(index<0){launchToastAlert('Word '+number+' was not found. Use the arrows to browse the source entries.');input.value=state.loadedNumber;return;}
    showRecord(index);
}
export function navigateWord(direction) {
    if(state.saving||!state.records.length)return;
    showRecord(Math.max(0,Math.min(state.records.length-1,(state.loadedIndex??0)+direction)));
}
export function applySavedText(text,number,occurrence=1) {
    const parsed=parseEditorBook(text,state.activeBook);
    state.records=parsed.records;state.availableThrough=parsed.availableThrough;state.availableCount=parsed.availableCount;
    state.loadedIndex=matchingRecordIndex(state.records,number,occurrence);
    if(state.loadedIndex<0)state.loadedIndex=0;
    const record=state.records[state.loadedIndex];
    state.loadedNumber=recordNumber(record,state.loadedIndex);
    byId('word-target-index').value=state.loadedNumber;
    byId('edit-arabic-field').value=record.word;
    byId('edit-meaning-field').value=editableMeaning(record);
}
