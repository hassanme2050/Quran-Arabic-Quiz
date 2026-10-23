import { state } from './state.js';
import { showToast } from './utils.js';

export function decodeTeacherQuizCode(code) {
    if (!/^[0-9A-F]+$/i.test(code)) return null;
    try {
        const decimalSequence = BigInt('0x' + code).toString(10).padStart(30, '0');
        if (decimalSequence.length !== 30) return null;
        const questionNumbers = [];
        for (let i = 0; i < 30; i += 3) {
            const number = Number(decimalSequence.slice(i, i + 3));
            if (!Number.isInteger(number) || number < 1) return null;
            questionNumbers.push(number);
        }
        if (questionNumbers.length !== 10 || new Set(questionNumbers).size !== 10) return null;
        return questionNumbers;
    } catch (error) {
        return null;
    }
}

export function getMeaningTokens(meaningString) {
    return meaningString.toLowerCase()
        .replace(/[!.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
        .split('/')
        .map(s => s.trim())
        .filter(s => s.length > 0);
}

export async function loadVocabulary() {
    try {
        const response = await fetch('./Vocabulary-File.txt');
        if (!response.ok) throw new Error('Network file access error.');
        const text = await response.text();
        parseVocabulary(text);
    } catch (error) {
        console.error(error);
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) statusMessage.textContent = '⚠️ Failed to read Vocabulary-File.txt. Check folder files.';
    }
}

export function parseVocabulary(text) {
    if (!text) {
        document.getElementById('status-message').textContent = '⚠️ Vocabulary-File.txt is empty.';
        return;
    }

    const lines = text.split('\n');
    state.vocabularyList = [];

    lines.forEach(line => {
        if (!line || !line.trim() || !line.includes('=')) return;

        const parts = line.split('=');
        if (parts.length >= 2) {
            const word = parts[0].trim();
            const meaning = parts[1].trim();
            if (word && meaning) {
                state.vocabularyList.push({ word, meaning });
            }
        }
    });

    const statusMessage = document.getElementById('status-message');
    const startInput = document.getElementById('range-input-start');
    const endInput = document.getElementById('range-input-end');

    if (state.vocabularyList.length === 0) {
        statusMessage.textContent = '⚠️ Loaded file, but found no matching "word = meaning" formats.';
    } else {
        statusMessage.textContent = '✅ Success: Loaded ' + state.vocabularyList.length + ' total words';
        startInput.value = 1;
        endInput.value = state.vocabularyList.length;
        endInput.max = state.vocabularyList.length;
        showToast('Vocabulary loaded successfully');
        switchView('menu-view');
    }
}

export function switchView(viewId) {
    const views = ['menu-view', 'flashcard-view', 'quiz-view', 'dictionary-view', 'quiz-finished-view', 'review-finished-view'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', id !== viewId);
    });
}
