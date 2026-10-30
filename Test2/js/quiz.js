import { decodeTeacherQuizCode } from '../shared/quiz-codes.js?v=1030.26-strawberry4';
export { decodeTeacherQuizCode };
import { state } from './state.js?v=1030.26-strawberry4';
import { vocabularyList, activeBook } from './vocabulary.js?v=1030.26-strawberry4';
import { shuffleArray } from './utils.js?v=1030.26-strawberry4';
import { switchView, showQuizCodeError, clearQuizCodeError, cancelPendingAnswer } from './ui.js?v=1030.26-strawberry4';
import {cancelQuizAttempt,elapsedMilliseconds,formatDuration,finishQuizAttempt} from './quiz-attempt.js?v=1030.26-strawberry4';
import {preloadScorecardRenderer} from './platform.js?v=1030.26-strawberry4';
import {tajweedChoices,tajweedContext,renderTajweedContext} from '../shared/tajweed.js?v=1030.26-strawberry4';

// Answer generation and meaning-token handling intentionally retain the original logic.
export function startQuizWithCode() {
    const input = document.getElementById('quiz-code-field');
    const enteredCode = input.value.trim().toUpperCase().replace(/\s+/g, '');
    clearQuizCodeError();
    if(activeBook==='book_c'){showQuizCodeError('Book C quiz codes are planned for a future update.');return;}

    if (vocabularyList.length === 0) {
        showQuizCodeError('Vocabulary is not loaded yet. Please wait and try again.');
        return;
    }

    const codeBook = enteredCode.startsWith('D4:') ? 'book_d' : enteredCode.startsWith('B2:') ? 'book_b' : 'book_a';
    if (codeBook !== activeBook) { showQuizCodeError('Select ' + (codeBook === 'book_d' ? 'Book D' : codeBook === 'book_b' ? 'Book B' : 'Book A - 500 Arabic Word (Arabic to English)') + ' for this quiz code.'); return; }
    const selectedQuestionNumbers = enteredCode ? decodeTeacherQuizCode(enteredCode) : null;
    if (!selectedQuestionNumbers) {
        showQuizCodeError('Invalid quiz code. Please try again or check with your teacher.');
        input.focus();
        return;
    }
    const selectedWords = [];
    for (const questionNumber of selectedQuestionNumbers) {
        const matches = activeBook !== 'book_a' ? vocabularyList.filter(item => item.number === questionNumber) : [];
        const selected = activeBook !== 'book_a' ? (matches.length === 1 ? matches[0] : null) : vocabularyList[questionNumber - 1];
        if (!Number.isInteger(questionNumber) || questionNumber < 1 || !selected) {
            showQuizCodeError('This quiz code is not available with the current vocabulary file. Please check with your teacher.');
            return;
        }
        selectedWords.push(selected);
    }

    if (selectedWords.length === 0) {
        showQuizCodeError('This quiz has no questions assigned. Please check with your teacher.');
        return;
    }

    cancelPendingAnswer();
    cancelQuizAttempt();
    // Keep the teacher's exact selection, but randomize the order for each student.
    state.sessionWords = [...selectedWords];
    shuffleArray(state.sessionWords);
    state.currentPool = [...vocabularyList];
    state.currentMode = 'quiz';
    state.currentIndex = 0;
    state.quizHistory = [];
    state.quizAttempt={phase:'ready',code:enteredCode,book:activeBook,name:'',startedAt:null,startClock:null,elapsedMs:0};
    document.getElementById('participant-name').value='';
    document.getElementById('participant-error').textContent='';
    document.getElementById('participant-quiz-info').textContent=(activeBook==='book_d'?'Book D':activeBook==='book_b'?'Book B':'Book A - 500 Arabic Word (Arabic to English)')+' · '+selectedWords.length+' questions';
    document.getElementById('participant-start-btn').disabled=false;
    document.getElementById('status-message').classList.add('hidden');
    document.getElementById('app-title').textContent = 'Quran Arabic Quiz';
    switchView('quiz-participant-view');
    document.getElementById('participant-name').focus();
    preloadScorecardRenderer();
}

export function startParticipantQuiz() {
    const attempt=state.quizAttempt;
    if(attempt?.phase!=='ready')return;
    const input=document.getElementById('participant-name'),name=input.value.trim().replace(/\s+/g,' ');
    if(!name||name.length>80){document.getElementById('participant-error').textContent='Please enter your name (up to 80 characters).';input.focus();return;}
    attempt.name=name;attempt.phase='countdown';attempt.countdown=3;
    document.getElementById('participant-error').textContent='';
    document.getElementById('participant-start-btn').disabled=true;
    document.getElementById('quiz-countdown-name').textContent='Get ready, '+name;
    document.getElementById('quiz-countdown-number').textContent='3';
    switchView('quiz-countdown-view');
    const tick=()=>{
        if(state.quizAttempt!==attempt||attempt.phase!=='countdown')return;
        attempt.countdown--;
        if(attempt.countdown>0){document.getElementById('quiz-countdown-number').textContent=attempt.countdown;state.countdownTimer=setTimeout(tick,1000);return;}
        state.countdownTimer=null;attempt.phase='running';attempt.startedAt=new Date().toISOString();attempt.startClock=performance.now();
        switchView('quiz-view');showQuizQuestion();updateQuizClock();
    };
    state.countdownTimer=setTimeout(tick,1000);
}
function updateQuizClock() {
    const attempt=state.quizAttempt;
    if(attempt?.phase!=='running')return;
    document.getElementById('quiz-elapsed-time').textContent=formatDuration(elapsedMilliseconds());
    state.quizClockTimer=setTimeout(updateQuizClock,250);
}

export function generateQuizChoices(correctItem) {
    if(activeBook==='book_c')return tajweedChoices(correctItem);
    let choices = [correctItem];
    const correctMeaningsLower = getMeaningTokens(correctItem.meaning);

    let validDistractors = vocabularyList.filter(item => {
        if (item.word === correctItem.word) return false;
        
        const itemMeaningsLower = getMeaningTokens(item.meaning);
        if (item.meaning.toLowerCase() === correctItem.meaning.toLowerCase()) return false;
        
        const hasOverlap = itemMeaningsLower.some(token => correctMeaningsLower.includes(token));
        return !hasOverlap;
    });

    if (validDistractors.length < 3) {
        validDistractors = vocabularyList.filter(item => item.word !== correctItem.word);
    }

    shuffleArray(validDistractors);

    for (let i = 0; i < validDistractors.length; i++) {
        if (choices.length >= 4) break;
        if (!choices.some(c => c.meaning.toLowerCase() === validDistractors[i].meaning.toLowerCase())) {
            choices.push(validDistractors[i]);
        }
    }

    if(activeBook==='book_d'){shuffleArray(choices);return choices;}
    while (choices.length < 4) {
        choices.push({ word: '—', meaning: 'Alternative Choice Option ' + (choices.length + 1) });
    }

    shuffleArray(choices);
    return choices;
}

export function getMeaningTokens(meaningString) {
    if (activeBook === 'book_b') return meaningString.split(/[\u060C,\u061B;/]/).map(token => token.trim()).filter(Boolean);
    return meaningString.toLowerCase()
        .replace(/[!.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .split('/')
        .map(s => s.trim())
        .filter(s => s.length > 0);
}

export function showQuizQuestion() {
    document.getElementById('quiz-time-badge').classList.toggle('hidden',state.quizAttempt?.phase!=='running');
    document.getElementById('quiz-view').classList.toggle('coded-quiz-running',state.quizAttempt?.phase==='running');
    const currentItem = state.sessionWords[state.currentIndex];
    document.getElementById('quiz-counter').textContent = "Question " + (state.currentIndex + 1) + " of " + state.sessionWords.length;
    document.getElementById('quiz-arabic-field').textContent = currentItem.word;
    const context=document.getElementById('quiz-question-context');
    renderTajweedContext(context,['book_c','book_d'].includes(activeBook)?currentItem:null);

    const optionsBox = document.getElementById('quiz-options-box');
    optionsBox.innerHTML = '';

    const choices = generateQuizChoices(currentItem);
    
    choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.textContent = choice.meaning;
        btn.dir = activeBook === 'book_b' ? 'rtl' : 'auto';
        btn.lang = activeBook === 'book_b' ? 'ur' : 'en';
        btn.onclick = function() { evaluateQuizAnswer(btn, choice, currentItem); };
        optionsBox.appendChild(btn);
    });
}

export function evaluateQuizAnswer(selectedButton, chosenChoice, correctItem) {
    if(selectedButton.disabled)return;
    const optionsBox = document.getElementById('quiz-options-box');
    const buttons = optionsBox.getElementsByTagName('button');
    
    for (let btn of buttons) {
        btn.disabled = true;
    }

    const isCorrect = (chosenChoice.meaning === correctItem.meaning);
    
    state.quizHistory.push({
        index: state.currentIndex + 1,
        word: correctItem.word,
        chosen: chosenChoice.meaning,
        correct: correctItem.meaning,
        isCorrect: isCorrect
    });
    if(state.currentIndex===state.sessionWords.length-1){
        finishQuizAttempt();
        if(state.quizAttempt?.phase==='finished')document.getElementById('quiz-elapsed-time').textContent=formatDuration(state.quizAttempt.elapsedMs);
    }

    if (isCorrect) {
        selectedButton.classList.add('correct-choice');
    } else {
        selectedButton.classList.add('wrong-choice');
        for (let btn of buttons) {
            if (btn.textContent === correctItem.meaning) {
                btn.classList.add('correct-choice');
            }
        }
    }

    state.answerTimer = setTimeout(() => {
        state.answerTimer = null;
        state.currentIndex++;
        if (state.currentIndex < state.sessionWords.length) {
            showQuizQuestion();
        } else {
            displayQuizSummary();
        }
    }, 1200);
}

export function displayQuizSummary() {
    finishQuizAttempt();
    const attempt=state.quizAttempt,hasParticipant=attempt?.phase==='finished';
    const target=document.getElementById('screenshot-target-scorecard');
    target.classList.toggle('participant-scorecard',hasParticipant);
    document.getElementById('scorecard-participant-details').classList.toggle('hidden',!hasParticipant);
    document.getElementById('scorecard-code').classList.toggle('hidden',!hasParticipant);
    document.getElementById('scorecard-export-status').textContent='';
    if(hasParticipant){
        document.getElementById('scorecard-participant-name').textContent=attempt.name;
        document.getElementById('scorecard-date').textContent=new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(attempt.startedAt));
        document.getElementById('scorecard-time').textContent=formatDuration(attempt.elapsedMs);
        document.getElementById('scorecard-code').textContent=(attempt.book==='book_d'?'Book D':attempt.book==='book_b'?'Book B':'Book A - 500 Arabic Word (Arabic to English)')+' · Quiz code: '+attempt.code;
    }
    const totalCorrect = state.quizHistory.filter(h => h.isCorrect).length;
    const percentage = Math.round((totalCorrect / state.sessionWords.length) * 100);
    
    document.getElementById('score-text-value').textContent = totalCorrect + "/" + state.sessionWords.length;
    document.getElementById('percent-text-value').textContent = percentage + "%";

    const tableContainer = document.getElementById('summary-table-container');
    tableContainer.classList.add('hidden');
    document.getElementById('toggle-table-btn').textContent = "📊 Show Performance Summary";

    const table = document.createElement('table');
    table.className = 'summary-table';
    const head = table.createTHead().insertRow();
    ['#', 'Result', activeBook==='book_c'?'Question':'Word', activeBook==='book_c'?'Correct Answer':'Correct Meaning', 'Your Choice'].forEach(label => {
        const cell = document.createElement('th');
        cell.textContent = label;
        head.appendChild(cell);
    });
    const body = table.createTBody();
    state.quizHistory.forEach(item => {
        const row = body.insertRow();
        const values = [item.index, item.isCorrect ? '✓' : '✗', item.word, item.correct, item.chosen];
        const classes = ['', item.isCorrect ? 'classic-indicator-pass' : 'classic-indicator-fail', 'large-bold-cell large-arabic-cell', 'large-bold-cell', 'small-choice-cell'];
        values.forEach((value, index) => {
            const cell = row.insertCell();
            cell.textContent = String(value);
            cell.className = classes[index];
        });
    });
    tableContainer.replaceChildren(table);
    switchView('quiz-finished-view');
}

export function toggleSummaryTableVisibility() {
    const tableContainer = document.getElementById('summary-table-container');
    const toggleBtn = document.getElementById('toggle-table-btn');
    
    if (tableContainer.classList.contains('hidden')) {
        tableContainer.classList.remove('hidden');
        toggleBtn.textContent = "📊 Hide Performance Summary";
    } else {
        tableContainer.classList.add('hidden');
        toggleBtn.textContent = "📊 Show Performance Summary";
    }
}
