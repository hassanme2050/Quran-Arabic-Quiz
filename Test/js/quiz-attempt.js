import {state} from './state.js?v=1029.26-strawberry7';

export function formatDuration(milliseconds) {
    const seconds=Math.max(0,Math.floor(milliseconds/1000));
    const hours=Math.floor(seconds/3600),minutes=Math.floor(seconds/60)%60;
    return (hours?String(hours).padStart(2,'0')+':':'')+String(hours?minutes:Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
}
export function elapsedMilliseconds(attempt=state.quizAttempt,now=performance.now()) {
    if(!attempt)return 0;
    if(attempt.phase==='finished')return attempt.elapsedMs;
    return attempt.phase==='running'?Math.max(0,now-attempt.startClock):0;
}
export function cancelQuizAttempt() {
    clearTimeout(state.countdownTimer);clearTimeout(state.quizClockTimer);
    state.countdownTimer=null;state.quizClockTimer=null;state.quizAttempt=null;
}
export function finishQuizAttempt() {
    const attempt=state.quizAttempt;
    if(attempt?.phase!=='running')return;
    attempt.elapsedMs=elapsedMilliseconds(attempt);
    attempt.finishedAt=new Date().toISOString();attempt.phase='finished';
    clearTimeout(state.quizClockTimer);state.quizClockTimer=null;
}
