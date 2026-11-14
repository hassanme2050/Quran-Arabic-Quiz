import { decodeTeacherQuizCode } from '../shared/quiz-codes.js';
export { decodeTeacherQuizCode };
import { state } from './state.js';
import { vocabularyList, activeBook } from './vocabulary.js';
import { shuffleArray } from './utils.js';
import { switchView, showQuizCodeError, clearQuizCodeError, cancelPendingAnswer } from './ui.js';
function promptOf(item){return activeBook==='book_e'?item.meaning:item.word;}
function answerOf(item){return activeBook==='book_e'?item.word:item.meaning;}
export function startQuizWithCode(){const input=document.getElementById('quiz-code-field'),code=input.value.trim().toUpperCase().replace(/\s+/g,'');clearQuizCodeError();if(!vocabularyList.length){showQuizCodeError('Vocabulary is not loaded yet.');return;}if(activeBook==='book_e'){showQuizCodeError('Quiz codes are not available for Book 5.');return;}const book=code.startsWith('B2:')?'book_b':'book_a';if(book!==activeBook){showQuizCodeError('Select '+(book==='book_b'?'Book B':'Book A')+' for this quiz code.');return;}const nums=code?decodeTeacherQuizCode(code):null;if(!nums){showQuizCodeError('Invalid quiz code. Please check with your teacher.');input.focus();return;}const selected=[];for(const n of nums){const matches=activeBook==='book_b'?vocabularyList.filter(x=>x.number===n):[];const item=activeBook==='book_b'?(matches.length===1?matches[0]:null):vocabularyList[n-1];if(!Number.isInteger(n)||n<1||!item){showQuizCodeError('Quiz code is unavailable with this book file.');return;}selected.push(item);}cancelPendingAnswer();state.sessionWords=selected;shuffleArray(state.sessionWords);state.currentPool=[...vocabularyList];state.currentMode='quiz';state.currentIndex=0;state.quizHistory=[];document.getElementById('status-message').classList.add('hidden');document.getElementById('app-title').textContent='QuranFahm.app';switchView('quiz-view');showQuizQuestion();}
export function generateQuizChoices(correct){const answer=answerOf(correct),prompt=promptOf(correct);let pool=vocabularyList.filter(x=>promptOf(x)!==prompt&&answerOf(x)!==answer);shuffleArray(pool);const choices=[correct];for(const item of pool){if(choices.length>=4)break;if(!choices.some(c=>answerOf(c).toLowerCase()===answerOf(item).toLowerCase()))choices.push(item);}while(choices.length<4)choices.push({word:'—',meaning:'Alternative Choice Option '+(choices.length+1)});shuffleArray(choices);return choices;}
export function getMeaningTokens(s){return String(s).toLowerCase().split(/[,;/،؛]/).map(x=>x.trim()).filter(Boolean);}
export function showQuizQuestion(){const item=state.sessionWords[state.currentIndex],prompt=document.getElementById('quiz-arabic-field'),isE=activeBook==='book_e';document.getElementById('quiz-counter').textContent='Question '+(state.currentIndex+1)+' of '+state.sessionWords.length;prompt.textContent=promptOf(item);prompt.classList.toggle('book5-english-prompt',isE);prompt.dir=isE?'ltr':'auto';prompt.lang=isE?'en':'ar';const box=document.getElementById('quiz-options-box');box.innerHTML='';generateQuizChoices(item).forEach(choice=>{const btn=document.createElement('button');btn.textContent=answerOf(choice);btn.dir=(activeBook==='book_b'||isE)?'rtl':'auto';btn.lang=isE?'ar':activeBook==='book_b'?'ur':'en';if(isE)btn.classList.add('book5-arabic-answer');btn.onclick=()=>evaluateQuizAnswer(btn,choice,item);box.appendChild(btn);});}
export function evaluateQuizAnswer(button,chosen,correct){const box=document.getElementById('quiz-options-box'),buttons=box.getElementsByTagName('button');for(const b of buttons)b.disabled=true;const isCorrect=answerOf(chosen)===answerOf(correct);state.quizHistory.push({index:state.currentIndex+1,word:promptOf(correct),chosen:answerOf(chosen),correct:answerOf(correct),isCorrect});if(isCorrect)button.classList.add('correct-choice');else{button.classList.add('wrong-choice');for(const b of buttons)if(b.textContent===answerOf(correct))b.classList.add('correct-choice');}state.answerTimer=setTimeout(()=>{state.answerTimer=null;state.currentIndex++;if(state.currentIndex<state.sessionWords.length)showQuizQuestion();else displayQuizSummary();},1200);}
export function displayQuizSummary() {
    const spelling = state.currentMode === 'spelling';
    const score = state.quizHistory.filter(item => item.isCorrect).length;
    const total = state.sessionWords.length;
    const mistakes = state.quizHistory.filter(item => !item.isCorrect);
    document.getElementById('scorecard-heading').textContent = spelling ? 'Spelling Complete!' : 'Quiz Complete!';
    document.getElementById('score-text-value').textContent = score + '/' + total;
    document.getElementById('percent-text-value').textContent = (total ? Math.round(score / total * 100) : 0) + '%';
    const count = document.getElementById('spelling-mistake-count');
    count.classList.toggle('hidden', !spelling);
    count.textContent = mistakes.length + (mistakes.length === 1 ? ' mistake' : ' mistakes');
    const container = document.getElementById('summary-table-container');
    container.classList.toggle('hidden', !spelling);
    const toggle = document.getElementById('toggle-table-btn');
    toggle.textContent = spelling ? 'Hide Mistakes' : '📊 Show Performance Summary';

    if (spelling && !mistakes.length) {
        const message = document.createElement('p');
        message.className = 'spelling-perfect-score';
        message.textContent = 'No mistakes. Well done!';
        container.replaceChildren(message);
    } else {
        const table = document.createElement('table');
        table.className = 'summary-table';
        const head = table.createTHead().insertRow();
        const labels = [
            '#', 'Result', activeBook === 'book_e' ? 'English Word' : 'Word',
            activeBook === 'book_e' ? 'Arabic Answer' : 'Correct Meaning',
            spelling ? 'Your Answer' : 'Your Choice'
        ];
        labels.forEach(label => {
            const cell = document.createElement('th');
            cell.textContent = label;
            head.appendChild(cell);
        });
        const body = table.createTBody();
        (spelling ? mistakes : state.quizHistory).forEach(item => {
            const row = body.insertRow();
            const values = [item.index, item.isCorrect ? '✓' : '×', item.word, item.correct, item.chosen];
            const classes = [
                '', item.isCorrect ? 'classic-indicator-pass' : 'classic-indicator-fail',
                activeBook === 'book_e' ? 'large-bold-cell' : 'large-bold-cell large-arabic-cell',
                'large-bold-cell', 'small-choice-cell'
            ];
            values.forEach((value, index) => {
                const cell = row.insertCell();
                cell.textContent = String(value);
                cell.className = classes[index];
                if (activeBook === 'book_e' && index >= 3) {
                    cell.dir = 'rtl';
                    cell.lang = 'ar';
                    cell.classList.add('book5-arabic-answer');
                }
            });
        });
        container.replaceChildren(table);
    }
    switchView('quiz-finished-view');
}
export function toggleSummaryTableVisibility() {
    const container = document.getElementById('summary-table-container');
    container.classList.toggle('hidden');
    const label = state.currentMode === 'spelling' ? 'Mistakes' : 'Performance Summary';
    document.getElementById('toggle-table-btn').textContent =
        (container.classList.contains('hidden') ? 'Show ' : 'Hide ') + label;
}
