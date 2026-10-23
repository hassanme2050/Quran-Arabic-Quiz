import { state } from './state.js';
import { switchView } from './vocabulary.js';
import { showToast } from './utils.js';

let dictionaryEntries = [];
let currentDictionaryIndex = 0;
let currentDictionarySort = 'arabic';

function getSortedEntries() {
    const entries = [...dictionaryEntries];

    if (currentDictionarySort === 'english') {
        return entries.sort((a, b) => a.english.localeCompare(b.english, undefined, { sensitivity: 'base' }));
    }

    if (currentDictionarySort === 'number') {
        return entries.sort((a, b) => a.number - b.number);
    }

    return entries.sort((a, b) => a.arabic.localeCompare(b.arabic, undefined, { sensitivity: 'base' }));
}

function updateDictionaryScroller() {
    const listEl = document.getElementById('dictionary-list');
    if (!listEl) return;

    const entries = getSortedEntries();
    const itemHeight = 88;
    const visibleCount = 4;

    if (!entries.length) {
        listEl.style.transform = 'translateY(0px)';
        return;
    }

    const offset = Math.max(0, currentDictionaryIndex - (visibleCount - 1));
    const translateY = -(offset * itemHeight);
    listEl.style.transform = `translateY(${translateY}px)`;

    const items = [...listEl.children];
    items.forEach((node) => {
        const itemIndex = Number(node.dataset.index);
        node.classList.toggle('active', itemIndex === currentDictionaryIndex);
    });
}

function renderDictionaryList() {
    const listEl = document.getElementById('dictionary-list');
    if (!listEl) return;

    const entries = getSortedEntries();
    listEl.innerHTML = '';

    if (!entries.length) {
        return;
    }

    entries.forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'dictionary-item' + (index === currentDictionaryIndex ? ' active' : '');
        item.dataset.index = index;

        const number = document.createElement('span');
        number.className = 'dict-number';
        number.textContent = '#' + entry.number;

        const arabic = document.createElement('span');
        arabic.className = 'dict-arabic';
        arabic.textContent = entry.arabic;

        const english = document.createElement('span');
        english.className = 'dict-english';
        english.textContent = entry.english;

        item.appendChild(number);
        item.appendChild(arabic);
        item.appendChild(english);

        item.addEventListener('click', () => {
            currentDictionaryIndex = index;
            updateDictionaryScroller();
        });

        listEl.appendChild(item);
    });

    updateDictionaryScroller();
}

export function loadDictionaryData() {
    if (!state.vocabularyList || state.vocabularyList.length === 0) {
        showToast('Vocabulary is not loaded yet.');
        return [];
    }

    dictionaryEntries = state.vocabularyList.map((item, index) => ({
        number: index + 1,
        arabic: item.word,
        english: item.meaning,
        original: item,
    }));

    return dictionaryEntries;
}

export function setDictionarySort(sortMode) {
    currentDictionarySort = sortMode;
    currentDictionaryIndex = 0;

    const slider = document.getElementById('dictionary-slider-pill');
    const arabicBtn = document.getElementById('dict-sort-arabic');
    const englishBtn = document.getElementById('dict-sort-english');
    const numberBtn = document.getElementById('dict-sort-number');

    if (!slider || !arabicBtn || !englishBtn || !numberBtn) return;

    arabicBtn.classList.remove('active');
    englishBtn.classList.remove('active');
    numberBtn.classList.remove('active');

    if (sortMode === 'arabic') {
        slider.style.transform = 'translateX(0%)';
        arabicBtn.classList.add('active');
    } else if (sortMode === 'english') {
        slider.style.transform = 'translateX(100%)';
        englishBtn.classList.add('active');
    } else {
        slider.style.transform = 'translateX(200%)';
        numberBtn.classList.add('active');
    }

    renderDictionaryList();
}

export function moveDictionary(direction) {
    const entries = getSortedEntries();
    if (!entries.length) return;

    if (direction === 'next') {
        currentDictionaryIndex = (currentDictionaryIndex + 1) % entries.length;
    } else {
        currentDictionaryIndex = (currentDictionaryIndex - 1 + entries.length) % entries.length;
    }

    updateDictionaryScroller();
}

export function openDictionary() {
    loadDictionaryData();
    currentDictionaryIndex = 0;
    renderDictionaryList();
    switchView('dictionary-view');
}

export function initDictionaryControls() {
    const arabicBtn = document.getElementById('dict-sort-arabic');
    const englishBtn = document.getElementById('dict-sort-english');
    const numberBtn = document.getElementById('dict-sort-number');
    const prevBtn = document.getElementById('dictionary-prev-btn');
    const nextBtn = document.getElementById('dictionary-next-btn');

    if (arabicBtn) {
        arabicBtn.addEventListener('click', () => setDictionarySort('arabic'));
    }
    if (englishBtn) {
        englishBtn.addEventListener('click', () => setDictionarySort('english'));
    }
    if (numberBtn) {
        numberBtn.addEventListener('click', () => setDictionarySort('number'));
    }
    if (prevBtn) {
        prevBtn.addEventListener('click', () => moveDictionary('prev'));
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => moveDictionary('next'));
    }

    setDictionarySort('arabic');
}
