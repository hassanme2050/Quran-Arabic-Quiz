import { state } from './state.js?v=1029.26-strawberry7';
import { toggleWordSelection, updateStickyCounterBanner } from './selection.js?v=1029.26-strawberry7';
export function renderInventoryTilesGrid() {
    const gridBox = document.getElementById('tiles-matrix-box');
    gridBox.replaceChildren();
    const fragment = document.createDocumentFragment();
    const totalRequiredPages = Math.ceil(state.fullVocabularyInventory.length / state.totalCardsPerPageLimit) || 1;
    if (state.activeMatrixPage < 1) state.activeMatrixPage = 1;
    if (state.activeMatrixPage > totalRequiredPages) state.activeMatrixPage = totalRequiredPages;
    const startIdx = (state.activeMatrixPage - 1) * state.totalCardsPerPageLimit;
    const endIdx = Math.min(startIdx + state.totalCardsPerPageLimit, state.fullVocabularyInventory.length);

    for (let i = startIdx; i < endIdx; i++) {
        const item = state.fullVocabularyInventory[i];
        const absoluteIndex = item.number || i + 1;
        const isSelected = state.selected.has(absoluteIndex);
        const tile = document.createElement('div');
        tile.className = 'compact-word-tile' + (isSelected ? ' selected-state' : '');
        tile.dataset.number = String(absoluteIndex);
        tile.setAttribute('role', 'button');
        tile.setAttribute('aria-pressed', String(isSelected));
        tile.tabIndex = 0;
        if (absoluteIndex > (state.activeBook === 'book_b' ? 9999 : 999)) {
            tile.setAttribute('aria-disabled', 'true');
            tile.tabIndex = -1;
        }
        const indexNode = document.createElement('div');
        indexNode.className = 'tile-header-index';
        indexNode.textContent = '#' + String(absoluteIndex).padStart(3, '0');
        const checkboxNode = document.createElement('div');
        checkboxNode.className = 'tile-checkbox-anchor';
        const arabicNode = document.createElement('div');
        arabicNode.className = 'tile-arabic-text';
        arabicNode.textContent = item.word;
        const meaningNode = document.createElement('div');
        meaningNode.className = 'tile-meaning-text';
        meaningNode.title = item.meaning;
        meaningNode.textContent = item.meaning;
        meaningNode.dir = state.activeBook === 'book_b' ? 'rtl' : 'auto';
        meaningNode.lang = state.activeBook === 'book_b' ? 'ur' : 'en';
        tile.append(indexNode, checkboxNode, arabicNode, meaningNode);
        fragment.appendChild(tile);
    }
    gridBox.appendChild(fragment);
    document.getElementById('page-number-text').textContent = 'Page ' + state.activeMatrixPage + ' of ' + totalRequiredPages;
    document.getElementById('prev-page-btn').disabled = (state.activeMatrixPage === 1);
    document.getElementById('next-page-btn').disabled = (state.activeMatrixPage === totalRequiredPages);
    updateStickyCounterBanner();
}
export function changeMatrixActivePage(offset) {
    state.activeMatrixPage += Number(offset);
    renderInventoryTilesGrid();
}
export function bindGridSelection() {
    const grid = document.getElementById('tiles-matrix-box');
    function select(event) {
        const tile = event.target.closest('[data-number]');
        if (tile && grid.contains(tile)) toggleWordSelection(Number(tile.dataset.number), tile);
    }
    grid.addEventListener('click', select);
    grid.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(event); }
    });
}
