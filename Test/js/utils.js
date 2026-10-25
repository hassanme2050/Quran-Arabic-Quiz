export function getRandomSubset(arr, size) {
    let shuffled = [...arr];
    shuffleArray(shuffled);
    return shuffled.slice(0, size);
}

export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
