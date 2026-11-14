import { activeBook } from './vocabulary.js';
import { state } from './state.js';
import { switchView } from './ui.js';

export function showCard() {
    document.getElementById('card-counter').textContent = "Word " + (state.currentIndex + 1) + " of " + state.sessionWords.length;
    const item = state.sessionWords[state.currentIndex];
    const prompt = document.getElementById('card-arabic-field');
    prompt.textContent = activeBook === 'book_e' ? item.meaning : item.word;
    prompt.classList.toggle('book5-english-prompt', activeBook === 'book_e');
    prompt.dir = activeBook === 'book_e' ? 'ltr' : 'rtl';
    prompt.lang = activeBook === 'book_e' ? 'en' : 'ar';
    const meaningField = document.getElementById('card-meaning-field');
    meaningField.textContent = (activeBook === 'book_e' ? item.word : item.meaning) + (item.explanation ? ' ' + item.explanation : '');
    meaningField.classList.toggle('book5-arabic-answer', activeBook === 'book_e');
    meaningField.dir = (activeBook === 'book_b' || activeBook === 'book_e') ? 'rtl' : 'auto';
    meaningField.lang = activeBook === 'book_b' ? 'ur' : activeBook === 'book_e' ? 'ar' : 'en';
    
    if (state.globalPersistentEyeToggleStatus) {
        state.isMeaningVisible = true;
        document.getElementById('card-meaning-field').classList.remove('hidden');
        document.getElementById('card-action-btn').textContent = "Next Word";
    } else {
        state.isMeaningVisible = false;
        document.getElementById('card-meaning-field').classList.add('hidden');
        document.getElementById('card-action-btn').textContent = "Show Meaning";
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
        actBtn.textContent = "Next Word";
    } else {
        eyeNode.classList.remove('visible-state');
        eyeNode.setAttribute('title', 'Show Meaning Permanently');
        state.isMeaningVisible = false;
        meaningField.classList.add('hidden');
        actBtn.textContent = "Show Meaning";
    }
}

export function handleFlashCardBodyClick() {
    if (state.globalPersistentEyeToggleStatus) return;
    
    state.isMeaningVisible = !state.isMeaningVisible;
    const meaningField = document.getElementById('card-meaning-field');
    const actBtn = document.getElementById('card-action-btn');
    
    if (state.isMeaningVisible) {
        meaningField.classList.remove('hidden');
        actBtn.textContent = "Next Word";
    } else {
        meaningField.classList.add('hidden');
        actBtn.textContent = "Show Meaning";
    }
}

export function handleCardProgression() {
    if (!state.isMeaningVisible) {
        state.isMeaningVisible = true;
        document.getElementById('card-meaning-field').classList.remove('hidden');
        document.getElementById('card-action-btn').textContent = "Next Word";
    } else {
        state.currentIndex++;
        if (state.currentIndex < state.sessionWords.length) {
            showCard();
        } else {
            switchView('review-finished-view');
        }
    }
}
