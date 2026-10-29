import { dictionaryVocabularyList as vocabularyList, activeBook } from './vocabulary.js';
import { switchView, launchToastAlert } from './ui.js';
import { searchDictionary, configureSearchKeyboard } from './dictionary-search.js?v=20261028-peaches-option1';
let dictionarySortMode = 'arabic';
let dictionarySortedItems = [];
let dictionaryJumpItems = [];
let dictionaryPointerActive = false;
let dictionaryRows = [];
let jumpTargets = new Map();
let cachedVocabulary;
let renderedVocabulary;
let renderedMode;
let renderedQuery;
let searchQuery = '';

function configureKeyboard() {
    const input = document.getElementById('dictionary-search');
    const language = dictionarySortMode === 'number' ? 'number' : dictionarySortMode === 'arabic' ? 'ar' : activeBook === 'book_b' ? 'ur' : 'en';
    configureSearchKeyboard(input, language);
}

export function initializeDictionarySearch() {
    const input = document.getElementById('dictionary-search');
    input.addEventListener('input', () => { searchQuery = input.value; renderDictionary(); });
    const toggle = document.getElementById('dictionary-search-toggle');
    const toolbar = document.getElementById('dictionary-toolbar');
    toggle.addEventListener('click', () => {
        toolbar.classList.add('search-open');
        toggle.classList.add('active');
        toggle.setAttribute('aria-expanded', 'true');
        toggle.setAttribute('aria-pressed', 'true');
        ['number','english','arabic'].forEach(key => {
            const button = document.getElementById('dict-sort-' + key);
            button.classList.remove('active');
            button.setAttribute('aria-pressed', 'false');
        });
        input.tabIndex = 0;
        // Synchronous focus within the tap allows the device keyboard to open.
        input.focus();
    });
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter') event.preventDefault();
        if (event.key === 'Escape') {
            setDictionarySort(dictionarySortMode);
            document.getElementById('dict-sort-' + dictionarySortMode).focus();
        }
    });
}
const sortedCache = new Map();
let markerFrame = null;
function scheduleDictionaryMarker() {
    if (markerFrame !== null) return;
    markerFrame = requestAnimationFrame(() => {
        markerFrame = null;
        updateDictionaryCurrentMarker();
    });
}

export function openDictionaryMode() {
    if (!vocabularyList.length) {
        launchToastAlert('Vocabulary is not loaded yet. Please wait and try again.');
        return;
    }
    document.getElementById('status-message').classList.add('hidden');
    document.getElementById('app-title').textContent = 'Quran Arabic Dictionary';
    document.getElementById('app-title').classList.add('dictionary-title');
    setDictionarySort(dictionarySortMode);
    switchView('dictionary-view');
    renderDictionary();
}

export function setDictionarySort(mode) {
    searchQuery = '';
    const input = document.getElementById('dictionary-search');
    input.value = '';
    input.tabIndex = -1;
    input.blur();
    document.getElementById('dictionary-toolbar').classList.remove('search-open');
    const toggle = document.getElementById('dictionary-search-toggle');
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-pressed', 'false');
    dictionarySortMode = mode;
    configureKeyboard();
    ['number','english','arabic'].forEach(key => {
        const button = document.getElementById('dict-sort-' + key);
        if (button) button.classList.toggle('active', key === mode);
        if (button) button.setAttribute('aria-pressed', String(key === mode));
    });
    const captions = { number: 'Original word order', english: activeBook === 'book_b' ? 'Sorted by Urdu Alphabet' : 'Sorted by English Alphabet', arabic: 'Sorted by Arabic Alphabet' };
    const pill = document.getElementById('dictionary-sort-pill');
    if (pill) pill.style.transform = 'translateX(' + ({number:0, english:100, arabic:200}[mode]) + '%)';
    const caption = document.getElementById('dictionary-sort-caption');
    if (caption) caption.textContent = captions[mode];
    if (!document.getElementById('dictionary-view').classList.contains('hidden')) renderDictionary();
}

export function getArabicSortKey(word) {
    return String(word || '').replace(/[\u064B-\u065F\u0670\u0640]/g, '').trim();
}

function numericJumpStep() { return Math.max(25, Math.ceil(vocabularyList.length / 25 / 25) * 25); }

export function getDictionaryJumpKey(item, index) {
    if (dictionarySortMode === 'number') return String(Math.ceil((index + 1) / numericJumpStep()) * numericJumpStep());
    if (dictionarySortMode === 'arabic') {
        const letters = ['ا','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'];
        const first = getArabicSortKey(item.word).charAt(0);
        return letters.includes(first) ? first : 'ا';
    }
    if (activeBook === 'book_b') return getArabicSortKey(item.meaning).charAt(0) || '#';
    const first = String(item.meaning || '').trim().charAt(0).toUpperCase();
    return /^[A-Z]$/.test(first) ? first : '#';
}

export function renderDictionary() {
    const list = document.getElementById('dictionary-list');
    if (!list) return;
    if (renderedVocabulary === vocabularyList && renderedMode === dictionarySortMode && renderedQuery === searchQuery) {
        scheduleDictionaryMarker();
        return;
    }
    if (cachedVocabulary !== vocabularyList) {
        sortedCache.clear();
        cachedVocabulary = vocabularyList;
    }
    if (!sortedCache.has(dictionarySortMode)) {
    dictionarySortedItems = vocabularyList.map((item, originalIndex) => ({...item, originalIndex}));
    if (dictionarySortMode === 'english') {
        dictionarySortedItems.sort((a,b) => a.meaning.localeCompare(b.meaning, activeBook === 'book_b' ? 'ur' : 'en', {sensitivity:'base'}) || a.originalIndex-b.originalIndex);
    } else if (dictionarySortMode === 'arabic') {
        dictionarySortedItems.sort((a,b) => getArabicSortKey(a.word).localeCompare(getArabicSortKey(b.word), 'ar') || a.originalIndex-b.originalIndex);
    } else {
        dictionarySortedItems.sort((a,b) => a.originalIndex-b.originalIndex);
    }
        sortedCache.set(dictionarySortMode, dictionarySortedItems);
    }
    dictionarySortedItems = searchDictionary(sortedCache.get(dictionarySortMode), searchQuery);
    list.innerHTML = '';
    const fragment = document.createDocumentFragment();
    dictionarySortedItems.forEach((item, index) => {
        if (index > 0 && index % 10 === 0) {
            const divider = document.createElement('div');
            divider.className = 'dictionary-ten-divider';
            divider.textContent = '# ' + index;
            divider.setAttribute('aria-label', 'Word ' + index);
            fragment.appendChild(divider);
        }
        const row = document.createElement('div');
        row.className = 'dictionary-entry';
        if (item.verified === false) row.classList.add('unverified');
        if ((index + 1) % 10 === 0) row.classList.add('before-ten-divider');
        row.dataset.index = String(index);
        row.dataset.jumpKey = getDictionaryJumpKey(item, index);
        const meaning = document.createElement('div');
        meaning.className = 'dictionary-meaning';
        meaning.textContent = item.meaning + (item.explanation ? ' ' + item.explanation : '');
        if (activeBook === 'book_b') { meaning.dir = 'rtl'; meaning.lang = 'ur'; }
        const word = document.createElement('div');
        word.className = 'dictionary-word';
        word.dir = 'rtl';
        word.textContent = item.word;
        const diamond = document.createElement('span');
        diamond.className = 'dictionary-diamond';
        diamond.setAttribute('aria-hidden', 'true');
        row.appendChild(meaning);
        row.appendChild(diamond);
        row.appendChild(word);
        fragment.appendChild(row);
    });
    if (!dictionarySortedItems.length) {
        const empty = document.createElement('div');
        empty.className = 'dictionary-empty';
        empty.textContent = searchQuery.trim() ? 'No matching words. Try a shorter search.' : 'No vocabulary words found.';
        fragment.appendChild(empty);
    }
    list.appendChild(fragment);
    document.getElementById('dictionary-count').textContent = dictionarySortedItems.length + (dictionarySortedItems.length === 1 ? ' word' : ' words');
    dictionaryRows = Array.from(list.querySelectorAll('.dictionary-entry'));
    jumpTargets = new Map();
    for (const row of dictionaryRows) {
        if (!jumpTargets.has(row.dataset.jumpKey)) jumpTargets.set(row.dataset.jumpKey, row);
    }
    renderedVocabulary = vocabularyList;
    renderedMode = dictionarySortMode;
    renderedQuery = searchQuery;
    buildDictionaryJumpIndex();
    list.scrollTop = 0;
    if (!list.dataset.wheelBound) {
        list.addEventListener('scroll', scheduleDictionaryMarker, {passive:true});
        window.addEventListener('resize', scheduleDictionaryMarker);
        list.dataset.wheelBound = '1';
    }
    scheduleDictionaryMarker();
}

export function buildDictionaryJumpIndex() {
    const jump = document.getElementById('dictionary-jump');
    jump.dataset.script = dictionarySortMode === 'arabic' || (dictionarySortMode === 'english' && activeBook === 'book_b') ? 'arabic' : 'latin';
    jump.innerHTML = '<div class="dictionary-jump-track"></div>';
    jump.classList.toggle('hidden', !!searchQuery.trim());
    document.getElementById('dictionary-list').classList.toggle('search-results', !!searchQuery.trim());
    const keys = searchQuery.trim() ? [] : [...jumpTargets.keys()];
    dictionaryJumpItems = keys;
    let shownKeys = keys;
    if (keys.length > 30 && dictionarySortMode === 'english' && activeBook !== 'book_b') shownKeys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(k => keys.includes(k)).concat(keys.includes('#') ? ['#'] : []);
    jump.style.setProperty('--dictionary-jump-count', String(Math.max(1, shownKeys.length)));
    shownKeys.forEach(key => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = key;
        btn.dataset.jumpKey = key;
        btn.setAttribute('aria-label', 'Jump to ' + key);
        btn.addEventListener('click', () => jumpDictionaryToKey(key));
        jump.appendChild(btn);
    });
    jump.onpointerdown = handleDictionaryJumpPointer;
    jump.onpointermove = handleDictionaryJumpPointerMove;
    jump.onpointerup = handleDictionaryJumpPointerEnd;
    jump.onpointercancel = handleDictionaryJumpPointerEnd;
}

export function handleDictionaryJumpPointer(event) {
    dictionaryPointerActive = true;
    const jump = document.getElementById('dictionary-jump');
    if (jump.setPointerCapture) jump.setPointerCapture(event.pointerId);
    jumpDictionaryAtY(event.clientY);
    event.preventDefault();
}

export function handleDictionaryJumpPointerMove(event) { if (dictionaryPointerActive) jumpDictionaryAtY(event.clientY); }

export function handleDictionaryJumpPointerEnd() { dictionaryPointerActive = false; }

export function jumpDictionaryAtY(y) {
    const jump = document.getElementById('dictionary-jump');
    const rect = jump.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (y - rect.top) / rect.height));
    const keys = dictionaryJumpItems;
    if (keys.length) jumpDictionaryToKey(keys[Math.round(fraction * (keys.length - 1))]);
}

export function jumpDictionaryToKey(key) {
    const list = document.getElementById('dictionary-list');
    const row = jumpTargets.get(key);
    if (row) {
        list.scrollTo({top: row.offsetTop - list.offsetTop, behavior:'smooth'});
        updateDictionaryActiveJump(key);
    }
}

export function updateDictionaryActiveJump(key) {
    document.querySelectorAll('#dictionary-jump button').forEach(button => button.classList.toggle('active', button.dataset.jumpKey === key));
}

export function updateDictionaryCurrentMarker() {
    const list = document.getElementById('dictionary-list');
    if (document.getElementById('dictionary-view').classList.contains('hidden')) return;
    const rows = dictionaryRows;
    if (!rows.length) return;
    const listRect = list.getBoundingClientRect();
    const centerY = listRect.top + list.clientHeight / 2;
    let nearest = rows[0], nearestDistance = Infinity;
    rows.forEach(row => {
        const rect = row.getBoundingClientRect();
        const distance = Math.abs((rect.top + rect.height / 2) - centerY);
        if (distance < nearestDistance) { nearest = row; nearestDistance = distance; }
    });
    updateDictionaryActiveJump(nearest.dataset.jumpKey || '');
}
