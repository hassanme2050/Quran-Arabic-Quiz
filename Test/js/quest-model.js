// Quest rules are independent of the DOM, storage and answer-choice generation.
export const WORDS_PER_STAGE = 10;
export const DRAGON_EVERY = 5;
export const DRAGON_WORDS = 25;
export const STAR_THRESHOLDS = [60, 80, 100];
export function buildQuestPlan(wordCount) {
    const plan = [];
    for (let index = 0; index < Math.ceil(wordCount / WORDS_PER_STAGE); index++) {
        const number = index + 1, firstWord = index * WORDS_PER_STAGE + 1;
        const lastWord = Math.min(wordCount, firstWord + WORDS_PER_STAGE - 1);
        plan.push({ id:'stage-'+number, kind:'stage', number, firstWord, lastWord,
            wordCount:lastWord-firstWord+1, title:'Stage '+number });
        if (number % DRAGON_EVERY === 0) plan.push({
            id:'dragon-'+number/DRAGON_EVERY, kind:'dragon', number:number/DRAGON_EVERY,
            firstWord:1, lastWord, wordCount:Math.min(DRAGON_WORDS,lastWord), title:'Dragon '+number/DRAGON_EVERY
        });
    }
    return plan;
}
export function emptyQuestProgress() {
    return { schema:1, book:'book_a', records:{}, words:{}, runs:{}, lastNode:null, savedAt:null };
}
const integer = value => Number.isSafeInteger(value) && value >= 0 ? Math.min(value,1e9) : 0;
const timestamp = value => Number.isSafeInteger(value) && value > 0 ? value : 0;
const wordNumbers = node => Array.from({length:node.wordCount},(_,i)=>node.firstWord+i);
const sameNumbers = (a,b) => a.length===b.length && [...a].sort((x,y)=>x-y).every((value,i)=>value===[...b].sort((x,y)=>x-y)[i]);
export function reconcileQuestProgress(input, wordCount) {
    const progress=emptyQuestProgress();
    if (!input || input.schema!==1 || input.book!=='book_a') return progress;
    const plan=buildQuestPlan(wordCount);
    for (const node of plan) {
        const record=input.records?.[node.id];
        if (record?.wordCount===node.wordCount && record?.lastWord===node.lastWord) progress.records[node.id]={
            wordCount:node.wordCount,lastWord:node.lastWord,bestStars:Math.min(3,integer(record.bestStars)),
            attempts:integer(record.attempts),bestCorrect:Math.min(node.wordCount,integer(record.bestCorrect))
        };
    }
    for (let number=1; number<=wordCount; number++) {
        const word=input.words?.[number];
        if (word && typeof word==='object') progress.words[number]={
            seen:integer(word.seen),correct:integer(word.correct),wrong:integer(word.wrong),streak:integer(word.streak),
            lastCorrect:timestamp(word.lastCorrect),lastWrong:timestamp(word.lastWrong)
        };
    }
    for (const node of plan) {
        const run=input.runs?.[node.id];
        if (!run || !isNodeUnlocked(plan,progress,node.id) || !Array.isArray(run.order)) continue;
        if (run.order.length!==node.wordCount || new Set(run.order).size!==node.wordCount ||
            run.order.some(number=>!Number.isInteger(number)||number<node.firstWord||number>node.lastWord)) continue;
        if (node.kind==='stage' && !sameNumbers(run.order,wordNumbers(node))) continue;
        if (!['review','quiz','result'].includes(run.phase)||!Array.isArray(run.answers)) continue;
        if (run.answers.length>node.wordCount || run.answers.some((answer,i)=>
            !answer||answer.number!==run.order[i]||typeof answer.correct!=='boolean'||typeof answer.chosen!=='string')) continue;
        if (run.phase==='result' && run.answers.length!==node.wordCount) continue;
        if (run.phase==='review' && (node.kind!=='stage'||run.answers.length)) continue;
        if (run.phase==='quiz' && run.answers.length===node.wordCount) continue;
        progress.runs[node.id]={
            phase:run.phase,order:[...run.order],reviewIndex:Math.min(node.wordCount-1,integer(run.reviewIndex)),
            answers:run.answers.map(answer=>({number:answer.number,correct:answer.correct,chosen:answer.chosen.slice(0,2000)}))
        };
    }
    progress.lastNode=plan.some(node=>node.id===input.lastNode)?input.lastNode:null;
    progress.savedAt=typeof input.savedAt==='string'?input.savedAt.slice(0,40):null;
    return progress;
}
export function isNodeUnlocked(plan, progress, id) {
    const index=plan.findIndex(node=>node.id===id);
    return index>=0 && plan.slice(0,index).every(node=>(progress.records[node.id]?.bestStars||0)>=1);
}
export function nextQuestNode(plan, progress) {
    return plan.find(node=>!(progress.records[node.id]?.bestStars>=1))||null;
}
export function starsForScore(correct,total) {
    return total ? STAR_THRESHOLDS.filter(threshold=>correct*100/total>=threshold).length : 0;
}
export function resultForRun(run) {
    const correct=run.answers.filter(answer=>answer.correct).length;
    return {correct,total:run.order.length,percent:Math.round(correct*100/run.order.length),stars:starsForScore(correct,run.order.length)};
}
function wordStats(progress,number) {
    return progress.words[number] ??= {seen:0,correct:0,wrong:0,streak:0,lastCorrect:0,lastWrong:0};
}
export function rankQuestWords(progress,lastWord) {
    return Array.from({length:lastWord},(_,i)=>i+1).sort((a,b)=>{
        const left=progress.words[a]||{}, right=progress.words[b]||{};
        const unresolved=w=>(w.wrong||0)>0 && (w.lastWrong||0)>=(w.lastCorrect||0)?1:0;
        const risk=w=>(w.wrong||0)/(((w.correct||0)+(w.wrong||0)+1)*((w.streak||0)+1));
        return unresolved(right)-unresolved(left)||risk(right)-risk(left)||(right.wrong||0)-(left.wrong||0)||
            (left.correct||0)-(right.correct||0)||a-b;
    });
}
export function beginQuestNode(plan,progress,id,shuffle) {
    const node=plan.find(item=>item.id===id);
    if (!node||!isNodeUnlocked(plan,progress,id)) throw new Error('Clear the previous stage first.');
    progress.lastNode=id;
    if (progress.runs[id]) return progress.runs[id];
    const order=node.kind==='dragon'?rankQuestWords(progress,node.lastWord).slice(0,node.wordCount):wordNumbers(node);
    if (node.kind==='dragon') shuffle(order);
    const run={phase:node.kind==='dragon'?'quiz':'review',order,reviewIndex:0,answers:[]};
    progress.runs[id]=run;
    if (run.phase==='review') wordStats(progress,order[0]).seen++;
    return run;
}
export function advanceQuestReview(progress,id,shuffle) {
    const run=progress.runs[id];
    if (!run||run.phase!=='review') return;
    if (run.reviewIndex<run.order.length-1) {run.reviewIndex++;wordStats(progress,run.order[run.reviewIndex]).seen++;}
    else {run.phase='quiz';shuffle(run.order);}
}
export function answerQuestQuestion(plan,progress,id,chosen,correct,now=Date.now()) {
    const node=plan.find(item=>item.id===id),run=progress.runs[id];
    if (!node||!run||run.phase!=='quiz'||run.answers.length>=run.order.length) throw new Error('No question is active.');
    const number=run.order[run.answers.length],stats=wordStats(progress,number);
    if (correct) {stats.correct++;stats.streak++;stats.lastCorrect=now;}
    else {stats.wrong++;stats.streak=0;stats.lastWrong=now;}
    run.answers.push({number,chosen,correct});
    if (run.answers.length===run.order.length) {
        run.phase='result';
        const result=resultForRun(run),previous=progress.records[id]||{};
        progress.records[id]={wordCount:node.wordCount,lastWord:node.lastWord,attempts:(previous.attempts||0)+1,
            bestStars:Math.max(previous.bestStars||0,result.stars),bestCorrect:Math.max(previous.bestCorrect||0,result.correct)};
    }
    return run;
}
export function retryQuestNode(plan,progress,id,shuffle) {
    delete progress.runs[id];return beginQuestNode(plan,progress,id,shuffle);
}
