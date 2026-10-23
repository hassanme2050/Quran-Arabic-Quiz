import { state } from './state.js';
import { getRandomSubset, shuffleArray, showToast } from './utils.js';
import { getMeaningTokens, switchView } from './vocabulary.js';

export function updateSegmentSelection(targetStrategy) {
    state.activeStrategySetting = targetStrategy;
    const pill = document.getElementById('active-slider-pill');
    const optAll = document.getElementById('opt-all');
    const optLast = document.getElementById('opt-last');
    const optCustom = document.getElementById('opt-custom');
    const drawer = document.getElementById('range-drawer-box');

    optAll.classList.remove('active');
    optLast.classList.remove('active');
    optCustom.classList.remove('active');

    if (targetStrategy === 'all') {
        pill.style.transform = 'translateX(0%)';
        optAll.classList.add('active');
        drawer.classList.remove('open');
    } else if (targetStrategy === 'last') {
        pill.style.transform = 'translateX(100%)';
        optLast.classList.add('active');
        drawer.classList.remove('open');
    } else if (targetStrategy === 'custom') {
        pill.style.transform = 'translateX(200%)';
        optCustom.classList.add('active');
        drawer.classList.add('open');
        validateLiveCustomBounds();
    }
}

export function validateLiveCustomBounds() {
    if (state.vocabularyList.length === 0) return;

    const startInp = document.getElementById('range-input-start');
    const endInp = document.getElementById('range-input-end');
    const startVal = parseInt(startInp.value, 10);
    const endVal = parseInt(endInp.value, 10);

    if (Number.isNaN(startVal) || startVal < 1) {
        startInp.value = 1;
        showToast('⚠️ Range must start at 1. Corrected automatically!');
        return;
    }

    if (Number.isNaN(endVal) || endVal > state.vocabularyList.length) {
        endInp.value = state.vocabularyList.length;
        showToast('⚠️ Range cannot exceed ' + state.vocabularyList.length + ' words. Corrected automatically!');
    }
}

export function triggerSelectedSession(mode) {
    if (state.activeStrategySetting === 'custom') {
        const startInp = document.getElementById('range-input-start');
        const endInp = document.getElementById('range-input-end');

        let startVal = parseInt(startInp.value, 10) || 1;
        let endVal = parseInt(endInp.value, 10) || state.vocabularyList.length;

        if (startVal < 1) startVal = 1;
        if (endVal > state.vocabularyList.length) endVal = state.vocabularyList.length;
        if (startVal > endVal) [startVal, endVal] = [endVal, startVal];

        const totalSpan = (endVal - startVal) + 1;
        if (totalSpan < 10) {
            showToast('⚠️ Custom range requires 10 words at least. Adjusting automatically!');
            if (startVal + 9 <= state.vocabularyList.length) {
                endVal = startVal + 9;
            } else {
                endVal = state.vocabularyList.length;
                startVal = Math.max(1, endVal - 9);
            }
            startInp.value = startVal;
            endInp.value = endVal;
        }
    }

    startSession(state.activeStrategySetting, mode);
}

export function startSession(strategy, mode) {
    state.currentMode = mode;
    state.quizHistory = [];
    document.getElementById('status-message').classList.add('hidden');

    if (strategy === 'all') {
        state.currentPool = [...state.vocabularyList];
        state.sessionWords = getRandomSubset(state.currentPool, 10);
    } else if (strategy === 'last') {
        state.currentPool = state.vocabularyList.slice(-10);
        state.sessionWords = [...state.currentPool];
        shuffleArray(state.sessionWords);
    } else if (strategy === 'custom') {
        const startIdx = parseInt(document.getElementById('range-input-start').value, 10) - 1;
        const endIdx = parseInt(document.getElementById('range-input-end').value, 10) - 1;
        state.currentPool = state.vocabularyList.slice(startIdx, endIdx + 1);
        state.sessionWords = getRandomSubset(state.currentPool, 10);
    }

    state.currentIndex = 0;

    if (state.currentMode === 'flashcard') {
        document.getElementById('app-title').textContent = 'Quran Arabic Flashcards';
        switchView('flashcard-view');
        const eyeNode = document.getElementById('card-eye-toggle');
        if (state.globalPersistentEyeToggleStatus) {
            eyeNode.classList.add('visible-state');
            eyeNode.setAttribute('title', 'Hide Meaning Permanently');
        } else {
            eyeNode.classList.remove('visible-state');
            eyeNode.setAttribute('title', 'Show Meaning Permanently');
        }
        showCard();
    } else {
        document.getElementById('app-title').textContent = 'Quran Arabic Quiz';
        switchView('quiz-view');
        showQuizQuestion();
    }
}

export function showCard() {
    const currentItem = state.sessionWords[state.currentIndex];
    document.getElementById('card-counter').textContent = 'Word ' + (state.currentIndex + 1) + ' of ' + state.sessionWords.length;
    document.getElementById('card-arabic-field').textContent = currentItem.word;
    document.getElementById('card-meaning-field').textContent = currentItem.meaning;

    if (state.globalPersistentEyeToggleStatus) {
        state.isMeaningVisible = true;
        document.getElementById('card-meaning-field').classList.remove('hidden');
        document.getElementById('card-action-btn').textContent = 'Next Word';
    } else {
        state.isMeaningVisible = false;
        document.getElementById('card-meaning-field').classList.add('hidden');
        document.getElementById('card-action-btn').textContent = 'Show Meaning';
    }
}

export function handleEyeToggleIntercept(event) {
    event.stopPropagation();
    state.globalPersistentEyeToggleStatus = !state.globalPersistentEyeToggleStatus;
    const eyeNode = document.getElementById('card-eye-toggle');
    const meaningField = document.getElementById('card-meaning-field');
    const actBtn = document.getElementById('card-action-btn');

    if (state.globalPersistentEyeToggleStatus) {
        eyeNode.classList.add('visible-state');
        eyeNode.setAttribute('title', 'Hide Meaning Permanently');
        state.isMeaningVisible = true;
        meaningField.classList.remove('hidden');
        actBtn.textContent = 'Next Word';
    } else {
        eyeNode.classList.remove('visible-state');
        eyeNode.setAttribute('title', 'Show Meaning Permanently');
        state.isMeaningVisible = false;
        meaningField.classList.add('hidden');
        actBtn.textContent = 'Show Meaning';
    }
}

export function handleFlashCardBodyClick() {
    if (state.globalPersistentEyeToggleStatus) return;

    state.isMeaningVisible = !state.isMeaningVisible;
    const meaningField = document.getElementById('card-meaning-field');
    const actBtn = document.getElementById('card-action-btn');

    if (state.isMeaningVisible) {
        meaningField.classList.remove('hidden');
        actBtn.textContent = 'Next Word';
    } else {
        meaningField.classList.add('hidden');
        actBtn.textContent = 'Show Meaning';
    }
}

export function handleCardProgression() {
    if (!state.isMeaningVisible) {
        state.isMeaningVisible = true;
        document.getElementById('card-meaning-field').classList.remove('hidden');
        document.getElementById('card-action-btn').textContent = 'Next Word';
    } else {
        state.currentIndex += 1;
        if (state.currentIndex < state.sessionWords.length) {
            showCard();
        } else {
            switchView('review-finished-view');
        }
    }
}

export function showQuizQuestion() {
    const currentItem = state.sessionWords[state.currentIndex];
    document.getElementById('quiz-counter').textContent = 'Question ' + (state.currentIndex + 1) + ' of ' + state.sessionWords.length;
    document.getElementById('quiz-arabic-field').textContent = currentItem.word;

    const optionsBox = document.getElementById('quiz-options-box');
    optionsBox.innerHTML = '';

    const choices = generateQuizChoices(currentItem);
    choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = choice.meaning;
        btn.onclick = () => evaluateQuizAnswer(btn, choice, currentItem);
        optionsBox.appendChild(btn);
    });
}

export function generateQuizChoices(correctItem) {
    let choices = [correctItem];
    const correctMeaningsLower = getMeaningTokens(correctItem.meaning);

    let validDistractors = state.vocabularyList.filter(item => {
        if (item.word === correctItem.word) return false;
        const itemMeaningsLower = getMeaningTokens(item.meaning);
        if (item.meaning.toLowerCase() === correctItem.meaning.toLowerCase()) return false;
        const hasOverlap = itemMeaningsLower.some(token => correctMeaningsLower.includes(token));
        return !hasOverlap;
    });

    if (validDistractors.length < 3) {
        validDistractors = state.vocabularyList.filter(item => item.word !== correctItem.word);
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

    return shuffleArray(choices);
}

export function evaluateQuizAnswer(selectedButton, chosenChoice, correctItem) {
    const optionsBox = document.getElementById('quiz-options-box');
    const buttons = optionsBox.getElementsByTagName('button');
    for (const btn of buttons) btn.disabled = true;

    const isCorrect = chosenChoice.word === correctItem.word;
    if (isCorrect) {
        selectedButton.classList.add('correct-choice');
        state.quizHistory.push({ question: correctItem.word, selected: chosenChoice.meaning, correct: true });
    } else {
        selectedButton.classList.add('wrong-choice');
        Array.from(buttons).forEach(btn => {
            if (btn.textContent.trim() === correctItem.meaning) {
                btn.classList.add('correct-choice');
            }
        });
        state.quizHistory.push({ question: correctItem.word, selected: chosenChoice.meaning, correct: false });
    }

    setTimeout(() => {
        state.currentIndex += 1;
        if (state.currentIndex < state.sessionWords.length) {
            showQuizQuestion();
        } else {
            finishQuiz();
        }
    }, 850);
}

export function finishQuiz() {
    const correctCount = state.quizHistory.filter(item => item.correct).length;
    const total = state.sessionWords.length;
    const percent = Math.round((correctCount / total) * 100);
    document.getElementById('score-text-value').textContent = correctCount + '/' + total;
    document.getElementById('percent-text-value').textContent = percent + '%';
    switchView('quiz-finished-view');
}

export function exitToHome() {
    document.getElementById('app-title').textContent = 'Quran Arabic Quiz';
    document.getElementById('status-message').classList.remove('hidden');
    switchView('menu-view');
}
