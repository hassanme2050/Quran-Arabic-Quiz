import test from 'node:test';
import assert from 'node:assert/strict';
import {formatDuration,elapsedMilliseconds,finishQuizAttempt,cancelQuizAttempt} from '../js/quiz-attempt.js?v=1029.26-strawberry3';
import {state} from '../js/state.js?v=1029.26-strawberry3';

test('elapsed clock excludes preparation and countdown, handles background gaps and freezes at completion',()=>{
    assert.equal(elapsedMilliseconds(null,90000),0);
    for(const phase of ['ready','countdown'])assert.equal(elapsedMilliseconds({phase,startClock:1000},90000),0);
    assert.equal(elapsedMilliseconds({phase:'running',startClock:1000},91000),90000);
    assert.equal(elapsedMilliseconds({phase:'running',startClock:2000},1000),0);
    assert.equal(elapsedMilliseconds({phase:'finished',elapsedMs:12345},900000),12345);
    for(const [ms,label] of [[0,'00:00'],[999,'00:00'],[1000,'00:01'],[61000,'01:01'],[3599999,'59:59'],[3600000,'01:00:00']])assert.equal(formatDuration(ms),label);
});
test('last answer freezes the recorded time once and cancellation clears both pending clocks',()=>{
    state.quizAttempt={phase:'running',startClock:performance.now()-60000};
    finishQuizAttempt();
    const elapsed=state.quizAttempt.elapsedMs,date=state.quizAttempt.finishedAt;
    assert(elapsed>=60000);assert.equal(state.quizAttempt.phase,'finished');
    finishQuizAttempt();assert.equal(state.quizAttempt.elapsedMs,elapsed);assert.equal(state.quizAttempt.finishedAt,date);
    const clear=globalThis.clearTimeout,calls=[];
    try {
        globalThis.clearTimeout=id=>calls.push(id);
        state.countdownTimer=123;state.quizClockTimer=456;cancelQuizAttempt();
        assert.deepEqual(calls,[123,456]);assert.equal(state.quizAttempt,null);
        assert.equal(state.countdownTimer,null);assert.equal(state.quizClockTimer,null);
    }finally{globalThis.clearTimeout=clear;}
});
