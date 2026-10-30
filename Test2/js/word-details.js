import {state} from './state.js?v=1030.26-strawberry3';
import {activeBook} from './vocabulary.js?v=1030.26-strawberry3';
import {switchView} from './ui.js?v=1030.26-strawberry3';
import {renderTajweedContext} from '../shared/tajweed.js?v=1030.26-strawberry3';
import {loadQuranVerse} from '../shared/quran-verses.js?v=1030.26-strawberry3';
let session=null,request=0,controller;
const byId=id=>document.getElementById(id);
function cancelRequest(){request++;controller?.abort();controller=null;}
export function cancelWordDetails(){cancelRequest();session=null;byId('verse-details-view').classList.add('hidden');byId('flashcard-view').inert=false;}
export function openWordDetails(){
    const record=state.sessionWords[state.currentIndex];
    if(activeBook!=='book_d'||state.currentMode!=='flashcard'||!record?.references?.length)return;
    cancelRequest();session={record,index:0,wordIndex:state.currentIndex};
    byId('flashcard-view').inert=true;
    renderTajweedContext(byId('verse-context'),record);byId('verse-details-view').classList.remove('hidden');renderVerse();
    byId('verse-back-btn').focus();
}
export function closeWordDetails(){
    if(!session)return;
    const sameWord=activeBook==='book_d'&&state.currentIndex===session.wordIndex&&state.sessionWords[state.currentIndex]===session.record;
    cancelWordDetails();if(sameWord){switchView('flashcard-view');byId('card-details-btn').focus();}
}
export function navigateWordVerse(direction){
    if(!session)return;
    const index=session.index+Number(direction);
    if(!Number.isInteger(index)||index<0||index>=session.record.references.length)return;
    session.index=index;renderVerse();
}
export function retryWordVerse(){if(session)renderVerse();}
async function renderVerse(){
    cancelRequest();const token=request,current=session,reference=current.record.references[current.index];
    controller=new AbortController();const activeController=controller;
    const timeout=setTimeout(()=>activeController.abort(),15000);
    byId('verse-counter').textContent='Verse '+(current.index+1)+' of '+current.record.references.length;
    byId('verse-reference').textContent=reference.key;
    byId('verse-word-meaning').textContent=current.record.word+' · '+reference.meaning;
    byId('verse-prev-btn').disabled=current.index===0;byId('verse-next-btn').disabled=current.index===current.record.references.length-1;
    for(const id of ['verse-arabic','verse-english','verse-error','verse-retry-btn','verse-attribution']){byId(id).classList.add('hidden');if(id!=='verse-retry-btn')byId(id).textContent='';}
    byId('verse-loading').classList.remove('hidden');byId('verse-content').setAttribute('aria-busy','true');
    try{
        const verse=await loadQuranVerse(reference,{signal:activeController.signal});
        if(token!==request||session!==current)return;
        byId('verse-arabic').textContent=verse.arabic;byId('verse-english').textContent=verse.english;
        byId('verse-attribution').textContent=verse.surahName+' · '+reference.key+' · English: '+verse.translation;
        for(const id of ['verse-arabic','verse-english','verse-attribution'])byId(id).classList.remove('hidden');
    }catch(error){
        if(token!==request||session!==current)return;
        byId('verse-error').textContent='Could not load '+reference.key+'. Check your connection or the reference in the book, then retry.';
        byId('verse-error').classList.remove('hidden');byId('verse-retry-btn').classList.remove('hidden');
    }finally{
        clearTimeout(timeout);
        if(token===request){byId('verse-loading').classList.add('hidden');byId('verse-content').setAttribute('aria-busy','false');}
    }
}
