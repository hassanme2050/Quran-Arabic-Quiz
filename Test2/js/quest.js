import { state } from './state.js?v=1030.26-strawberry7';
import { vocabularyList, activeBook, loadVocabulary } from './vocabulary.js?v=1030.26-strawberry7';
import { loadBook as loadBookRecords } from '../shared/vocabulary.js?v=1030.26-strawberry7';
import { shuffleArray } from './utils.js?v=1030.26-strawberry7';
import { generateQuizChoices } from './quiz.js?v=1030.26-strawberry7';
import { switchView, exitToHome, cancelPendingAnswer, launchToastAlert } from './ui.js?v=1030.26-strawberry7';
import { buildQuestPlan, isNodeUnlocked, nextQuestNode, beginQuestNode, advanceQuestReview,
    answerQuestQuestion, retryQuestNode, resultForRun, rankQuestWords } from './quest-model.js?v=1030.26-strawberry7';
import { createQuestLibraryStorage, parseQuestBackup, QUEST_BOOKS } from './quest-storage.js?v=1030.26-strawberry7';
import {tajweedContext,renderTajweedContext,tajweedReviewAnswer} from '../shared/tajweed.js?v=1030.26-strawberry7';
import {openAyahDetails,cancelWordDetails} from './word-details.js?v=1030.26-strawberry7';

let progress,plan=[],store,loadedVocabulary,currentId=null,answerLocked=false,nextId=null;
const byId=id=>document.getElementById(id);
const stars=count=>'★'.repeat(count)+'☆'.repeat(3-count);
const currentNode=()=>plan.find(node=>node.id===currentId);
const currentRun=()=>progress.runs[currentId];
function ensureProgress() {
    if (loadedVocabulary===vocabularyList && progress) return;
    if(!store) {
        let storage;
        try {storage=globalThis.localStorage;} catch {}
        store=createQuestLibraryStorage(storage);
    }
    progress=store.loadBook(activeBook,vocabularyList.length);
    currentId=null;nextId=null;
    loadedVocabulary=vocabularyList;
    plan=buildQuestPlan(vocabularyList.length);
}
function persist() {
    store.save(progress);
    updateSaveNotes();
}
function updateSaveNotes() {
    const note=store.issue||'Each book is saved in this browser. Export progress to back up all books.';
    byId('quest-save-note').textContent=note;
    byId('quest-save-note').classList.toggle('quest-save-warning',Boolean(store.issue));
    document.querySelectorAll('.quest-session-save').forEach(element=>{element.textContent=store.issue||'Your place is saved automatically.';});
}
function show(view) {
    cancelWordDetails();
    cancelPendingAnswer();
    byId('status-message').classList.add('hidden');
    byId('app-title').classList.remove('dictionary-title');
    byId('app-title').textContent='Quran Arabic Quest';
    switchView(view);
    byId(view).dataset.book=activeBook;
    updateSaveNotes();
}
function make(tag,className,text) {
    const element=document.createElement(tag);
    if(className)element.className=className;
    if(text!==undefined)element.textContent=text;
    return element;
}
function continuationNode() {
    const prior=plan.find(node=>node.id===progress.lastNode);
    if(prior && progress.runs[prior.id]?.phase!=='result' && progress.runs[prior.id] && isNodeUnlocked(plan,progress,prior.id))return prior;
    return nextQuestNode(plan,progress);
}
export async function openQuest() {
    if(!vocabularyList.length){launchToastAlert('No verified Quest words are available for this book yet.');return;}
    ensureProgress();
    renderQuestMap();
}
export function renderQuestMap() {
    answerLocked=false;
    byId('quest-trouble-summary').textContent=activeBook==='book_c'?'Questions to strengthen':'Words to strengthen';
    byId('quest-book-selector').value=activeBook;
    const stages=plan.filter(node=>node.kind==='stage'),dragons=plan.filter(node=>node.kind==='dragon');
    const cleared=nodes=>nodes.filter(node=>(progress.records[node.id]?.bestStars||0)>=1).length;
    const totalStars=plan.reduce((sum,node)=>sum+(progress.records[node.id]?.bestStars||0),0);
    byId('quest-overview').textContent=cleared(stages)+' / '+stages.length+' stages · '+cleared(dragons)+' / '+dragons.length+' dragons · '+totalStars+' stars';
    byId('quest-progress').max=Math.max(plan.length,1);
    byId('quest-progress').value=cleared(plan);
    const target=continuationNode();
    const cta=byId('quest-continue');
    cta.disabled=!target;
    cta.textContent=target?(progress.runs[target.id]?'Continue ':'Begin ')+target.title:'Journey complete — replay any stage below';
    cta.onclick=()=>{if(target)startNode(target.id);};
    const list=byId('quest-map-nodes');
    list.replaceChildren();
    const pathPoints=[];
    const width=Math.max(320,plan.length*144+32),height=224;
    byId('quest-route').setAttribute('viewBox','0 0 '+width+' '+height);
    list.parentElement.style.width=width+'px';
    list.parentElement.style.height=height+'px';
    plan.forEach((node,index)=>{
        const unlocked=isNodeUnlocked(plan,progress,node.id);
        const record=progress.records[node.id],earned=record?.bestStars||0;
        const x=88+index*144,y=index%2?58:30;
        pathPoints.push({x,y:y+32});
        const stop=make('li','quest-stop');
        stop.style.left=x+'px';stop.style.top=y+'px';
        const button=make('button','quest-node'+(node.kind==='dragon'?' quest-dragon':''),unlocked?(node.kind==='dragon'?'🐉':String(node.number)):'🔒');
        button.type='button';button.disabled=!unlocked;
        button.dataset.node=node.id;
        button.dataset.status=!unlocked?'locked':earned?'cleared':target?.id===node.id?'current':'available';
        const first=vocabularyList[node.firstWord-1]?.number??node.firstWord;
        const last=vocabularyList[node.lastWord-1]?.number??node.lastWord;
        const range=node.kind==='dragon'?node.wordCount+' adaptive words':'Words '+first+'–'+last;
        button.setAttribute('aria-label',node.title+'. '+range+'. '+(!unlocked?'Locked':earned?earned+' of 3 stars':'Ready'));
        button.onclick=()=>startNode(node.id);
        stop.append(button,make('strong','quest-stop-title',node.title),make('span','quest-stop-range',range));
        const starRow=make('span','quest-stop-stars',stars(earned));
        starRow.setAttribute('aria-hidden','true');stop.appendChild(starRow);
        list.appendChild(stop);
    });
    const path=pathPoints.map((point,index)=>{
        if(!index)return 'M '+point.x+' '+point.y;
        const prior=pathPoints[index-1];
        return 'C '+(prior.x+72)+' '+prior.y+' '+(point.x-72)+' '+point.y+' '+point.x+' '+point.y;
    }).join(' ');
    byId('quest-route-path').setAttribute('d',path);
    renderWeakWords();
    show('quest-map-view');
    {
        const node=list.querySelector('[data-node="'+(target?.id||plan.at(-1)?.id)+'"]');
        if(node){const viewport=byId('quest-map-scroll');viewport.scrollLeft=node.parentElement.offsetLeft-viewport.clientWidth/2;}
    }
}
function renderWeakWords() {
    const list=byId('quest-weak-words');list.replaceChildren();
    const lastLearned=Math.max(0,...Object.keys(progress.words).map(Number));
    const weak=rankQuestWords(progress,lastLearned).filter(number=>progress.words[number]?.wrong>0).slice(0,10);
    if(!weak.length){list.appendChild(make('p','quest-empty','No trouble words yet. Your challenges adapt as you play.'));return;}
    const table=make('table','summary-table'),head=make('thead'),hr=make('tr');
    for(const label of [activeBook==='book_c'?'Question #':'Word #',activeBook==='book_c'?'Question':'Arabic',activeBook==='book_c'?'Answer':'Meaning','Misses','Correct'])hr.appendChild(make('th','',label));
    head.appendChild(hr);table.appendChild(head);const body=make('tbody');
    for(const number of weak){
        const item=vocabularyList[number-1],stats=progress.words[number],row=make('tr');
        row.append(make('td','',item.number??number),make('td','large-bold-cell large-arabic-cell',item.word),make('td','',item.meaning),make('td','',stats.wrong),make('td','',stats.correct));
        body.appendChild(row);
    }
    table.appendChild(body);list.appendChild(table);
}

function startNode(id) {
    currentId=id;
    try {beginQuestNode(plan,progress,id,shuffleArray);persist();renderRun();}
    catch(error){launchToastAlert(error.message);}
}
function renderRun() {
    answerLocked=false;
    const run=currentRun();
    if(run.phase==='review')renderReview();
    else if(run.phase==='quiz')renderQuestion();
    else renderResult();
}
function configureDetails(triggerId,viewId,record,isCurrent){
    const button=byId(triggerId),available=activeBook==='book_d'&&Boolean(record.references?.length);
    button.classList.toggle('hidden',!available);button.disabled=!available;
    button.onclick=available?()=>openAyahDetails(record,{viewId,triggerId,isCurrent}):null;
}
function renderReview() {
    const node=currentNode(),run=currentRun(),number=run.order[run.reviewIndex],item=vocabularyList[number-1];
    byId('quest-review-heading').textContent=node.title+(activeBook==='book_c'?' · QUESTIONS ':' · WORDS ')+(vocabularyList[node.firstWord-1].number??node.firstWord)+'–'+(vocabularyList[node.lastWord-1].number??node.lastWord);
    byId('quest-review-title').textContent=activeBook==='book_c'?'Meet your next questions':'Meet your next words';
    byId('quest-review-description').textContent=activeBook==='book_c'?'Read the question and correct answer. The quiz starts after your final card.':'Read the word and meaning. The quiz starts after your final card.';
    byId('quest-review-counter').textContent='Review '+(run.reviewIndex+1)+' of '+run.order.length;
    byId('quest-review-number').textContent=(activeBook==='book_c'?'Book question #':'Book word #')+(item.number??number);
    byId('quest-review-word').textContent=item.word;
    byId('quest-review-word').dir=activeBook==='book_c'?'auto':'rtl';
    byId('quest-review-word').lang=activeBook==='book_c'?'en':'ar';
    renderTajweedContext(byId('quest-review-context'),['book_c','book_d'].includes(activeBook)?item:null);
    byId('quest-review-meaning').textContent=activeBook==='book_c'?tajweedReviewAnswer(item.meaning):item.meaning;
    const nodeId=currentId,reviewIndex=run.reviewIndex;
    configureDetails('quest-review-details-btn','quest-review-view',item,
        ()=>currentId===nodeId&&currentRun()===run&&run.phase==='review'&&run.reviewIndex===reviewIndex);
    byId('quest-review-next').textContent=run.reviewIndex===run.order.length-1?'Start shuffled quiz →':activeBook==='book_c'?'Next question →':'Next word →';
    show('quest-review-view');
}
function renderQuestion() {
    const node=currentNode(),run=currentRun(),number=run.order[run.answers.length],item=vocabularyList[number-1];
    const dragon=node.kind==='dragon';
    byId('quest-quiz-heading').textContent=node.title+(dragon?' · DRAGON CHECKPOINT':' · SHUFFLED QUIZ');
    byId('quest-quiz-title').textContent=dragon?'Face your dragon':activeBook==='book_c'?'Test your Tajweed knowledge':'Put your words to the test';
    const subject=activeBook==='book_c'?'questions':'words';
    byId('quest-quiz-description').textContent=dragon?'These '+run.order.length+' learned '+subject+' prioritize your recent and repeated mistakes.':
        'The same '+subject+' you just reviewed, in a new order.';
    byId('quest-question-counter').textContent='Question '+(run.answers.length+1)+' of '+run.order.length;
    byId('quest-question-number').textContent=(activeBook==='book_c'?'Book question #':'Book word #')+(item.number??number);
    byId('quest-question-word').textContent=item.word;
    byId('quest-question-word').dir=activeBook==='book_c'?'auto':'rtl';
    byId('quest-question-word').lang=activeBook==='book_c'?'en':'ar';
    const nodeId=currentId,answerCount=run.answers.length;
    configureDetails('quest-question-details-btn','quest-quiz-view',item,
        ()=>!answerLocked&&currentId===nodeId&&currentRun()===run&&run.phase==='quiz'&&run.answers.length===answerCount);
    renderTajweedContext(byId('quest-question-context'),['book_c','book_d'].includes(activeBook)?item:null);
    byId('quest-feedback').textContent='';
    const options=byId('quest-answer-options');
    options.replaceChildren();
    // Reuse Pineapple's exact distractor generation and meaning matching.
    for(const choice of generateQuizChoices(item)) {
        const button=make('button','',choice.meaning);
        button.type='button';
        button.onclick=()=>submitAnswer(button,choice,item);
        options.appendChild(button);
    }
    answerLocked=false;
    show('quest-quiz-view');
}
function submitAnswer(button,choice,item) {
    if(answerLocked)return;
    answerLocked=true;
    byId('quest-question-details-btn').disabled=true;
    const correct=choice.meaning===item.meaning;
    const options=byId('quest-answer-options');
    for(const option of options.querySelectorAll('button')) {
        option.disabled=true;
        if(option.textContent===item.meaning)option.classList.add('correct-choice');
    }
    if(!correct)button.classList.add('wrong-choice');
    answerQuestQuestion(plan,progress,currentId,choice.meaning,correct);
    persist();
    byId('quest-feedback').textContent=correct?'✓ Correct!':(activeBook==='book_c'?'Correct answer: ':'Correct meaning: ')+item.meaning;
    byId('quest-feedback').classList.toggle('quest-feedback-wrong',!correct);
    const answeredId=currentId;
    cancelPendingAnswer();
    state.answerTimer=setTimeout(()=>{
        state.answerTimer=null;
        if(currentId===answeredId && !byId('quest-quiz-view').classList.contains('hidden'))renderRun();
    },1200);
}
function renderResult() {
    const node=currentNode(),run=currentRun(),result=resultForRun(run),index=plan.findIndex(item=>item.id===node.id);
    nextId=plan[index+1]?.id||null;
    byId('quest-result-stage').textContent=node.title+(node.kind==='dragon'?' · DRAGON CHECKPOINT':'');
    const display=byId('quest-result-stars');
    display.textContent=stars(result.stars);
    display.setAttribute('aria-label',result.stars+' of 3 stars earned');
    byId('quest-result-title').textContent=result.stars?(node.kind==='dragon'?'Dragon cleared!':'Stage cleared!'):'A little more practice';
    byId('quest-result-score').textContent=result.correct+' / '+result.total+' · '+result.percent+'%';
    byId('quest-result-message').textContent=result.stars?(nextId?'Your next stop is unlocked. Keep going, or replay for more stars.':'You reached the end of this book! New stages appear as words are added.'):
        'Get at least '+Math.ceil(result.total*0.6)+' correct answers to earn one star. Review the words and try again.';
    const next=byId('quest-result-continue');
    next.classList.toggle('hidden',!result.stars||!nextId);
    next.textContent=nextId?'Continue to '+plan[index+1].title+' →':'Quest complete';
    byId('quest-result-retry').textContent=node.kind==='dragon'?'Try dragon again':'Review & try again';
    const list=byId('quest-result-answers');
    list.replaceChildren();
    for(const answer of run.answers) {
        const item=vocabularyList[answer.number-1];
        const row=make('li','quest-result-answer'+(answer.correct?'':' quest-missed'));
        row.append(make('span','quest-answer-mark',answer.correct?'✓':'✕'),make('span','quest-word-index','#'+(item.number??answer.number)),
            make('span','quest-arabic',item.word),make('span','quest-answer-meaning',item.meaning));
        if(!answer.correct)row.appendChild(make('small','quest-your-answer','Your answer: '+answer.chosen));
        list.appendChild(row);
    }
    show('quest-result-view');
}
function exportProgress() {
    const blob=new Blob([JSON.stringify(store.backup(),null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='QuranAQ-Quest-All-Books-Progress.json';
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    launchToastAlert('All books exported in one Quest progress backup.');
}
async function importProgress(event) {
    const file=event.target.files[0];
    if(!file)return;
    try {
        if(file.size>5000000)throw new Error('This progress file is too large.');
        const counts=Object.fromEntries(await Promise.all(QUEST_BOOKS.map(async book=>[book,
            book===activeBook?vocabularyList.length:(await loadBookRecords(book)).filter(item=>item.verified!==false).length])));
        const imported=parseQuestBackup(await file.text(),counts);
        const names=Object.keys(imported).map(book=>book==='book_a'?'Book A - 500 Arabic Word (Arabic to English)':book==='book_c'?'Book C - Quran Tajweed':book==='book_d'?'Book D':'Book B').join(' and ');
        if(!window.confirm('Replace Quest progress for '+names+' in this browser with this backup?'))return;
        store.importBooks(imported);
        progress=store.loadBook(activeBook,vocabularyList.length);currentId=null;renderQuestMap();
        launchToastAlert('Quest progress imported for '+names+'.');
    } catch(error){launchToastAlert(error.message);}
    finally{event.target.value='';}
}
export function initializeQuest() {
    byId('quest-book-selector').addEventListener('change',async event=>{
        const selector=event.target,book=selector.value;
        selector.disabled=true;
        try {
            byId('vocabulary-book-selector').value=book;
            await loadVocabulary(book);
            if(activeBook===book&&vocabularyList.length)await openQuest();
        } finally {selector.disabled=false;}
    });
    byId('quest-review-next').addEventListener('click',()=>{advanceQuestReview(progress,currentId,shuffleArray);persist();renderRun();});
    byId('quest-result-retry').addEventListener('click',()=>{retryQuestNode(plan,progress,currentId,shuffleArray);persist();renderRun();});
    byId('quest-result-continue').addEventListener('click',()=>{if(nextId)startNode(nextId);});
    document.querySelectorAll('[data-quest-action]').forEach(button=>button.addEventListener('click',()=>{
        if(button.dataset.questAction==='home')exitToHome();else renderQuestMap();
    }));
    byId('quest-export').addEventListener('click',exportProgress);
    byId('quest-import').addEventListener('click',()=>byId('quest-import-file').click());
    byId('quest-import-file').addEventListener('change',importProgress);
}
