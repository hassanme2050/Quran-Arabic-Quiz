export const state = {
    vocabularyList: [],
    currentPool: [],
    sessionWords: [],
    currentIndex: 0,
    isMeaningVisible: false,
    currentMode: 'flashcard',
    quizHistory: [],
    activeStrategySetting: 'all',
    globalPersistentEyeToggleStatus: false,
};

export function resetSessionState() {
    state.currentPool = [];
    state.sessionWords = [];
    state.currentIndex = 0;
    state.isMeaningVisible = false;
    state.quizHistory = [];
}

export function setWordSelection(words) {
    state.sessionWords = words;
    state.currentIndex = 0;
}
