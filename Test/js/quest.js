import { state } from './state.js';
import { vocabularyList, activeBook, loadVocabulary } from './vocabulary.js';
import { shuffleArray } from './utils.js';
import { generateQuizChoices } from './quiz.js';
import { switchView, exitToHome, cancelPendingAnswer, launchToastAlert } from './ui.js';
import { buildQuestPlan, isNodeUnlocked, nextQuestNode, beginQuestNode, advanceQuestReview,
    answerQuestQuestion, retryQuestNode, resultForRun, rankQuestWords } from './quest-model.js';
import { createQuestStorage, parseQuestImport } from './quest-storage.js';

let progress,plan=[],store,loadedVocabulary,currentId=null,answerLocked=false,nextId=null;
const byId=id=>document.getElementById(id);
const stars=count=>'★'.repeat(count)+'☆'.repeat(3-count);
const currentNode=()=>plan.find(node=>node.id===currentId);
const currentRun=()=>progress.runs[currentId];
function ensureProgress() {
    if (loadedVocabulary===vocabularyList && progress) return;
    let storage;
    try {storage=globalThis.localStorage;} catch {}
    store=createQuestStorage(storage);
    progress=store.load(vocabularyList.length);
    loadedVocabulary=vocabularyList;
    plan=buildQuestPlan(vocabularyList.length);
}
function persist() {
    store.save(progress);
    updateSaveNotes();
}
function updateSaveNotes() {
    const note=store.issue||'Progress saved in this browser. Export a backup to keep it safe.';
    byId('quest-save-note').textContent=note;
    byId('quest-save-note').classList.toggle('quest-save-warning',Boolean(store.issue));
    document.querySelectorAll('.quest-session-save').forEach(element=>{element.textContent=store.issue||'Your place is saved automatically.';});
}
function show(view) {
    cancelPendingAnswer();
    byId('status-message').classList.add('hidden');
    byId('app-title').classList.remove('dictionary-title');
    byId('app-title').textContent='Quran Arabic Quest';
    switchView(view);
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
    if(activeBook !== 'book_a') {
        document.getElementById('vocabulary-book-selector').value='book_a';
        await loadVocabulary('book_a');
        launchToastAlert('Quest uses Book A.');
    }
    if(!vocabularyList.length){launchToastAlert('Vocabulary is not loaded yet.');return;}
    ensureProgress();
    renderQuestMap();
}
export function renderQuestMap() {
    answerLocked=false;
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
        const range=node.kind==='dragon'?node.wordCount+' adaptive words':'Words '+node.firstWord+'–'+node.lastWord;
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
    for(const label of ['Word #','Arabic','Meaning','Misses','Correct'])hr.appendChild(make('th','',label));
    head.appendChild(hr);table.appendChild(head);const body=make('tbody');
    for(const number of weak){
        const item=vocabularyList[number-1],stats=progress.words[number],row=make('tr');
        row.append(make('td','',number),make('td','large-bold-cell large-arabic-cell',item.word),make('td','',item.meaning),make('td','',stats.wrong),make('td','',stats.correct));
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
function renderReview() {
    const node=currentNode(),run=currentRun(),number=run.order[run.reviewIndex],item=vocabularyList[number-1];
    byId('quest-review-heading').textContent=node.title+' · WORDS '+node.firstWord+'–'+node.lastWord;
    byId('quest-review-counter').textContent='Review '+(run.reviewIndex+1)+' of '+run.order.length;
    byId('quest-review-number').textContent='Book word #'+number;
    byId('quest-review-word').textContent=item.word;
    byId('quest-review-meaning').textContent=item.meaning;
    byId('quest-review-next').textContent=run.reviewIndex===run.order.length-1?'Start shuffled quiz →':'Next word →';
    show('quest-review-view');
}
function renderQuestion() {
    const node=currentNode(),run=currentRun(),number=run.order[run.answers.length],item=vocabularyList[number-1];
    const dragon=node.kind==='dragon';
    byId('quest-quiz-heading').textContent=node.title+(dragon?' · DRAGON CHECKPOINT':' · SHUFFLED QUIZ');
    byId('quest-quiz-title').textContent=dragon?'Face your dragon':'Put your words to the test';
    byId('quest-quiz-description').textContent=dragon?'These '+run.order.length+' learned words prioritize your recent and repeated mistakes.':
        'The same words you just reviewed, in a new order.';
    byId('quest-question-counter').textContent='Question '+(run.answers.length+1)+' of '+run.order.length;
    byId('quest-question-number').textContent='Book word #'+number;
    byId('quest-question-word').textContent=item.word;
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
    const correct=choice.meaning===item.meaning;
    const options=byId('quest-answer-options');
    for(const option of options.querySelectorAll('button')) {
        option.disabled=true;
        if(option.textContent===item.meaning)option.classList.add('correct-choice');
    }
    if(!correct)button.classList.add('wrong-choice');
    answerQuestQuestion(plan,progress,currentId,choice.meaning,correct);
    persist();
    byId('quest-feedback').textContent=correct?'✓ Correct!':'Correct meaning: '+item.meaning;
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
        row.append(make('span','quest-answer-mark',answer.correct?'✓':'✕'),make('span','quest-word-index','#'+answer.number),
            make('span','quest-arabic',item.word),make('span','quest-answer-meaning',item.meaning));
        if(!answer.correct)row.appendChild(make('small','quest-your-answer','Your answer: '+answer.chosen));
        list.appendChild(row);
    }
    show('quest-result-view');
}
function exportProgress() {
    const blob=new Blob([JSON.stringify(progress,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='QuranAQ-Quest-Progress.json';
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    launchToastAlert('Quest progress exported. Keep the file as a backup.');
}
async function importProgress(event) {
    const file=event.target.files[0];
    if(!file)return;
    try {
        if(file.size>1000000)throw new Error('This progress file is too large.');
        const imported=parseQuestImport(await file.text(),vocabularyList.length);
        if(!window.confirm('Replace Quest progress in this browser with this backup?'))return;
        progress=imported;currentId=null;persist();renderQuestMap();
        launchToastAlert('Quest progress imported.');
    } catch(error){launchToastAlert(error.message);}
    finally{event.target.value='';}
}
export function initializeQuest() {
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
