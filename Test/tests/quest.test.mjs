import test from 'node:test';
import assert from 'node:assert/strict';
import {buildQuestPlan,emptyQuestProgress,isNodeUnlocked,nextQuestNode,beginQuestNode,advanceQuestReview,
    answerQuestQuestion,retryQuestNode,starsForScore,rankQuestWords,reconcileQuestProgress,resultForRun} from '../js/quest-model.js?v=1029.26-strawberry1';
import {createQuestStorage,parseQuestImport} from '../js/quest-storage.js?v=1029.26-strawberry1';
const shuffle=array=>array.reverse();
function finish(plan,progress,id,correctCount=10) {
    const run=beginQuestNode(plan,progress,id,shuffle);
    while(run.phase==='review')advanceQuestReview(progress,id,shuffle);
    while(run.phase==='quiz')answerQuestQuestion(plan,progress,id,'test meaning',run.answers.length<correctCount,1000+run.answers.length);
    return run;
}
test('book sequence covers every word once, with a partial last stage and five-stage dragon gates',()=>{
    const plan=buildQuestPlan(88);
    assert.equal(plan.length,10);
    assert.deepEqual(plan.map(node=>node.id),['stage-1','stage-2','stage-3','stage-4','stage-5','dragon-1','stage-6','stage-7','stage-8','stage-9']);
    assert.deepEqual(plan.filter(node=>node.kind==='stage').flatMap(node=>Array.from({length:node.wordCount},(_,i)=>node.firstWord+i)),Array.from({length:88},(_,i)=>i+1));
    assert.equal(plan.at(-1).wordCount,8);
    assert.equal(buildQuestPlan(100).at(-1).id,'dragon-2');
    assert.deepEqual(buildQuestPlan(0),[]);
});
test('star boundaries work for normal, partial and dragon stages',()=>{
    for(const [score,total,stars] of [[5,10,0],[6,10,1],[7,10,1],[8,10,2],[9,10,2],[10,10,3],[14,25,0],[15,25,1],[20,25,2],[25,25,3],[4,8,0],[5,8,1],[7,8,2],[8,8,3],[0,0,0]])assert.equal(starsForScore(score,total),stars);
});
test('a stage must review every word visibly in book order before a shuffled quiz',()=>{
    const plan=buildQuestPlan(88),progress=emptyQuestProgress(),run=beginQuestNode(plan,progress,'stage-1',shuffle);
    assert.equal(run.phase,'review');
    const seen=[];
    while(run.phase==='review'){seen.push(run.order[run.reviewIndex]);advanceQuestReview(progress,'stage-1',shuffle);}
    assert.deepEqual(seen,[1,2,3,4,5,6,7,8,9,10]);
    assert.deepEqual(run.order,[10,9,8,7,6,5,4,3,2,1]);
    assert.equal(progress.words[10].seen,1);
});
test('failure never unlocks another stage; retry repeats review and passing unlocks',()=>{
    const plan=buildQuestPlan(88),progress=emptyQuestProgress();
    assert.throws(()=>beginQuestNode(plan,progress,'stage-2',shuffle));
    const failed=finish(plan,progress,'stage-1',5);
    assert.equal(resultForRun(failed).stars,0);
    assert.equal(isNodeUnlocked(plan,progress,'stage-2'),false);
    assert.equal(retryQuestNode(plan,progress,'stage-1',shuffle).phase,'review');
    finish(plan,progress,'stage-1',6);
    assert(isNodeUnlocked(plan,progress,'stage-2'));
    assert.equal(progress.records['stage-1'].attempts,2);
});
test('dragon gate blocks stage six, draws 25 unique learned words and prioritizes misses',()=>{
    const plan=buildQuestPlan(88),progress=emptyQuestProgress();
    for(let number=1;number<=5;number++)finish(plan,progress,'stage-'+number,6);
    assert.equal(nextQuestNode(plan,progress).id,'dragon-1');
    assert(!isNodeUnlocked(plan,progress,'stage-6'));
    const missed=Object.entries(progress.words).filter(([,stats])=>stats.wrong>0).map(([number])=>Number(number));
    const dragon=beginQuestNode(plan,progress,'dragon-1',shuffle);
    assert.equal(dragon.phase,'quiz');assert.equal(dragon.order.length,25);assert.equal(new Set(dragon.order).size,25);
    assert(dragon.order.every(number=>number>=1&&number<=50));
    assert(missed.every(number=>dragon.order.includes(number)));
    finish(plan,progress,'dragon-1',14);
    assert(!isNodeUnlocked(plan,progress,'stage-6'));
    retryQuestNode(plan,progress,'dragon-1',shuffle);
    finish(plan,progress,'dragon-1',15);
    assert(isNodeUnlocked(plan,progress,'stage-6'));
});
test('correct streaks reduce risk and retries never erase previously earned stars',()=>{
    const plan=buildQuestPlan(10),progress=emptyQuestProgress();
    finish(plan,progress,'stage-1',10);
    retryQuestNode(plan,progress,'stage-1',shuffle);finish(plan,progress,'stage-1',0);
    assert.equal(progress.records['stage-1'].bestStars,3);
    assert.equal(progress.records['stage-1'].attempts,2);
    progress.words[1]={wrong:3,correct:1,streak:0,lastWrong:200,lastCorrect:100};
    progress.words[2]={wrong:3,correct:10,streak:7,lastWrong:100,lastCorrect:200};
    assert(rankQuestWords(progress,10).indexOf(1)<rankQuestWords(progress,10).indexOf(2));
});
test('checkpoint saves restore exact review and quiz positions without re-counting answers',()=>{
    const data=new Map(),storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
    const store=createQuestStorage(storage,'test'),plan=buildQuestPlan(88),progress=emptyQuestProgress();
    const run=beginQuestNode(plan,progress,'stage-1',shuffle);
    for(let i=0;i<4;i++)advanceQuestReview(progress,'stage-1',shuffle);
    store.save(progress);
    const review=store.load(88);
    assert.equal(review.runs['stage-1'].reviewIndex,4);
    while(run.phase==='review')advanceQuestReview(progress,'stage-1',shuffle);
    answerQuestQuestion(plan,progress,'stage-1','wrong',false,10);
    store.save(progress);
    const restored=store.load(88);
    assert.equal(restored.runs['stage-1'].answers.length,1);
    assert.deepEqual(restored.runs['stage-1'].order,run.order);
    assert.equal(restored.words[10].wrong,1);
    assert.equal(beginQuestNode(plan,restored,'stage-1',shuffle).answers.length,1);
});
test('appended vocabulary preserves older stages and reopens an expanded partial stage',()=>{
    const plan=buildQuestPlan(88),progress=emptyQuestProgress();
    for(const node of plan)finish(plan,progress,node.id,node.wordCount);
    const grown=reconcileQuestProgress(progress,89);
    assert.equal(grown.records['stage-1'].bestStars,3);
    assert.equal(grown.records['dragon-1'].bestStars,3);
    assert.equal(grown.records['stage-9'],undefined);
    assert.equal(grown.runs['stage-9'],undefined);
    assert.equal(nextQuestNode(buildQuestPlan(89),grown).id,'stage-9');
});
test('blocked storage and corrupted backups are handled without crashing',()=>{
    const blocked=createQuestStorage({getItem(){throw Error('blocked');},setItem(){throw Error('quota');}},'test');
    assert.equal(blocked.load(88).schema,1);assert(blocked.issue);
    assert.equal(blocked.save(emptyQuestProgress()),false);assert(blocked.issue);
    assert.throws(()=>parseQuestImport('bad',88));
    assert.throws(()=>parseQuestImport('{"schema":1,"book":"other"}',88));
    assert.throws(()=>parseQuestImport('x'.repeat(1000001),88));
    const clean=parseQuestImport(JSON.stringify(emptyQuestProgress()),88);
    assert.equal(clean.book,'book_a');
});
test('malformed resume data and locked attempts cannot bypass stage sequencing',()=>{
    const input=emptyQuestProgress();
    input.runs['stage-2']={phase:'quiz',order:Array.from({length:10},(_,i)=>i+11),reviewIndex:0,answers:[]};
    input.runs['stage-1']={phase:'quiz',order:Array(10).fill(1),reviewIndex:0,answers:[]};
    const clean=reconcileQuestProgress(input,88);
    assert.deepEqual(clean.runs,{});
});
