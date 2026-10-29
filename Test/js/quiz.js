import { decodeTeacherQuizCode } from '../shared/quiz-codes.js';
export { decodeTeacherQuizCode };
import { state } from './state.js';
import { vocabularyList } from './vocabulary.js';
import { shuffleArray } from './utils.js';
import { switchView, showQuizCodeError, clearQuizCodeError, cancelPendingAnswer } from './ui.js';

// Answer generation and meaning-token handling intentionally retain the original logic.
export function startQuizWithCode() {
    const input = document.getElementById('quiz-code-field');
    const enteredCode = input.value.trim().toUpperCase().replace(/\s+/g, '');
    clearQuizCodeError();

    if (vocabularyList.length === 0) {
        showQuizCodeError('Vocabulary is not loaded yet. Please wait and try again.');
        return;
    }

    const selectedQuestionNumbers = enteredCode ? decodeTeacherQuizCode(enteredCode) : null;
    if (!selectedQuestionNumbers) {
        showQuizCodeError('Invalid quiz code. Please try again or check with your teacher.');
        input.focus();
        return;
    }
    const selectedWords = [];
    for (const questionNumber of selectedQuestionNumbers) {
        if (!Number.isInteger(questionNumber) || questionNumber < 1 || questionNumber > vocabularyList.length) {
            showQuizCodeError('This quiz code is not available with the current vocabulary file. Please check with your teacher.');
            return;
        }
        selectedWords.push(vocabularyList[questionNumber - 1]);
    }

    if (selectedWords.length === 0) {
        showQuizCodeError('This quiz has no questions assigned. Please check with your teacher.');
        return;
    }

    cancelPendingAnswer();
    // Keep the teacher's exact selection, but randomize the order for each student.
    state.sessionWords = [...selectedWords];
    shuffleArray(state.sessionWords);
    state.currentPool = [...vocabularyList];
    state.currentMode = 'quiz';
    state.currentIndex = 0;
    state.quizHistory = [];
    document.getElementById('status-message').classList.add('hidden');
    document.getElementById('app-title').textContent = 'Quran Arabic Quiz';
    switchView('quiz-view');
    showQuizQuestion();
}

export function generateQuizChoices(correctItem) {
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

    while (choices.length < 4) {
        choices.push({ word: '—', meaning: 'Alternative Choice Option ' + (choices.length + 1) });
    }

    shuffleArray(choices);
    return choices;
}

export function getMeaningTokens(meaningString) {
    return meaningString.toLowerCase()
        .replace(/[!.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
        .split('/')
        .map(s => s.trim())
        .filter(s => s.length > 0);
}

export function showQuizQuestion() {
    const currentItem = state.sessionWords[state.currentIndex];
    document.getElementById('quiz-counter').textContent = "Question " + (state.currentIndex + 1) + " of " + state.sessionWords.length;
    document.getElementById('quiz-arabic-field').textContent = currentItem.word;

    const optionsBox = document.getElementById('quiz-options-box');
    optionsBox.innerHTML = '';

    const choices = generateQuizChoices(currentItem);
    
    choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.textContent = choice.meaning;
        btn.onclick = function() { evaluateQuizAnswer(btn, choice, currentItem); };
        optionsBox.appendChild(btn);
    });
}

export function evaluateQuizAnswer(selectedButton, chosenChoice, correctItem) {
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
    ['#', 'Result', 'Word', 'Correct Meaning', 'Your Choice'].forEach(label => {
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
