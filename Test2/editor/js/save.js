import {state} from './state.js?v=1030.26-editor4';
import {launchToastAlert} from '../../shared/ui.js?v=1030.26-strawberry4';
import {saveVocabularyRecord,saveVerificationBoundary} from './github.js?v=1030.26-editor4';
import {setEditorLocked,hasUnsavedEdits,applySavedText,questionField,wrongAnswerValues} from './records.js?v=1030.26-editor4';
import {validateEditorUpdate} from './book.js?v=1030.26-editor4';

function selectedRecord() {
    const record=state.records[state.loadedIndex];
    if(!record||state.loadedNumber!==Number(document.getElementById('word-target-index').value)) {
        launchToastAlert('Load the requested word number with GO first.');return null;
    }
    if(!state.token){launchToastAlert('GitHub token is missing. Please log in again.');return null;}
    return record;
}
export async function saveWordUpdateToGitHub() {
    if(state.saving)return;
    const expected=selectedRecord();if(!expected)return;
    const number=state.loadedNumber;
    const updated={word:questionField().value.trim(),meaning:document.getElementById('edit-meaning-field').value.trim()};
    if(state.activeBook==='book_d')updated.referenceText=document.getElementById('edit-references-field').value.trim();
    if(state.activeBook==='book_c')updated.wrongAnswers=wrongAnswerValues().map(answer=>answer.trim());
    try {validateEditorUpdate(updated,state.activeBook);}catch(error){launchToastAlert(error.message);return;}
    state.saving=true;setEditorLocked(true);launchToastAlert('Saving changes to GitHub...');
    try {
        const result=await saveVocabularyRecord({filename:state.activeFile,token:state.token,number,expected,updated});
        applySavedText(result.text,number,expected.occurrence??1);
        launchToastAlert('Word #'+number+' saved to GitHub.');
    } catch(error){launchToastAlert('Save failed: '+error.message);}
    finally {state.saving=false;setEditorLocked(false);}
}
export async function makeWordsAvailable() {
    if(state.saving||!['book_b','book_c'].includes(state.activeBook))return;
    const expected=selectedRecord();if(!expected)return;
    if(hasUnsavedEdits()){launchToastAlert('Save your corrections before making this word available.');return;}
    const number=state.loadedNumber;
    state.saving=true;setEditorLocked(true);launchToastAlert('Checking student availability on GitHub...');
    try {
        const result=await saveVerificationBoundary({filename:state.activeFile,token:state.token,number,expected});
        applySavedText(result.text,number,expected.occurrence??1);
        const noun=state.activeBook==='book_c'?'Questions':'Words';
        launchToastAlert(result.changed?noun+' through #'+result.availableThrough+' are now available to students.':'These '+noun.toLowerCase()+' are already available to students (through #'+result.availableThrough+').');
    } catch(error){launchToastAlert('Could not update availability: '+error.message);}
    finally {state.saving=false;setEditorLocked(false);}
}
