import { state } from './state.js?v=1030.26-dates3';

// Work with the verified book sequence without changing source numbers or order.
export function tenWordRound(records, round) {
    const count = Math.ceil(records.length / 10);
    const selected = Math.max(1, Math.min(count || 1, Math.floor(Number(round)) || 1));
    return records.slice((selected - 1) * 10, selected * 10);
}
export function refreshTenWordRounds(records, bookId) {
    const selector = document.getElementById('ten-word-round');
    if (!selector) return;
    const count = Math.ceil(records.length / 10);
    state.activeRound = 1;
    selector.replaceChildren();
    for (let index = 0; index < count; index++) {
        const first = index * 10 + 1;
        const last = Math.min(records.length, first + 9);
        const option = document.createElement('option');
        option.value = String(index + 1);
        option.textContent = (index + 1) + ' — ' + (bookId === 'book_c' ? 'Questions ' : 'Words ') + first + '–' + last;
        selector.appendChild(option);
    }
    selector.value = '1';
    selector.disabled = count === 0;
}
export function selectTenWordRound(round) {
    state.activeRound = Math.max(1, Math.floor(Number(round)) || 1);
}
