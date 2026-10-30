import { activeBook } from './vocabulary.js?v=1029.26-strawberry8';
import { state } from './state.js?v=1029.26-strawberry8';
import { switchView } from './ui.js?v=1029.26-strawberry8';
import {tajweedContext,renderTajweedContext,tajweedReviewAnswer} from '../shared/tajweed.js?v=1029.26-strawberry8';

export function showCard() {
    document.getElementById('card-counter').textContent = (activeBook==='book_c'?'Question ':'Word ') + (state.currentIndex + 1) + " of " + state.sessionWords.length;
    document.getElementById('card-arabic-field').textContent = state.sessionWords[state.currentIndex].word;
    const item = state.sessionWords[state.currentIndex];
    const context=document.getElementById('card-context');renderTajweedContext(context,activeBook==='book_c'?item:null);
    const meaningField = document.getElementById('card-meaning-field');
    meaningField.textContent = (activeBook==='book_c'?tajweedReviewAnswer(item.meaning):item.meaning) + (item.explanation ? ' ' + item.explanation : '');
    meaningField.dir = activeBook === 'book_b' ? 'rtl' : 'auto';
    meaningField.lang = activeBook === 'book_b' ? 'ur' : 'en';
    
    if (state.globalPersistentEyeToggleStatus) {
        state.isMeaningVisible = true;
        document.getElementById('card-meaning-field').classList.remove('hidden');
        document.getElementById('card-action-btn').textContent = (activeBook==='book_c'?'Next Question':'Next Word');
    } else {
        state.isMeaningVisible = false;
        document.getElementById('card-meaning-field').classList.add('hidden');
        document.getElementById('card-action-btn').textContent = (activeBook==='book_c'?'Show Answer':'Show Meaning');
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
        actBtn.textContent = (activeBook==='book_c'?'Next Question':'Next Word');
    } else {
        eyeNode.classList.remove('visible-state');
        eyeNode.setAttribute('title', 'Show Meaning Permanently');
        state.isMeaningVisible = false;
        meaningField.classList.add('hidden');
        actBtn.textContent = (activeBook==='book_c'?'Show Answer':'Show Meaning');
    }
}

export function handleFlashCardBodyClick() {
    if (state.globalPersistentEyeToggleStatus) return;
    
    state.isMeaningVisible = !state.isMeaningVisible;
    const meaningField = document.getElementById('card-meaning-field');
    const actBtn = document.getElementById('card-action-btn');
    
    if (state.isMeaningVisible) {
        meaningField.classList.remove('hidden');
        actBtn.textContent = (activeBook==='book_c'?'Next Question':'Next Word');
    } else {
        meaningField.classList.add('hidden');
        actBtn.textContent = (activeBook==='book_c'?'Show Answer':'Show Meaning');
    }
}

export function handleCardProgression() {
    if (!state.isMeaningVisible) {
        state.isMeaningVisible = true;
        document.getElementById('card-meaning-field').classList.remove('hidden');
        document.getElementById('card-action-btn').textContent = (activeBook==='book_c'?'Next Question':'Next Word');
    } else {
        state.currentIndex++;
        if (state.currentIndex < state.sessionWords.length) {
            showCard();
        } else {
            switchView('review-finished-view');
        }
    }
}
