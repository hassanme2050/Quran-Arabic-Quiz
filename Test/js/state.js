// Shared session data. Vocabulary book order is never changed by display sorting.
export const state = {
  currentPool: [], sessionWords: [], currentIndex: 0,
  isMeaningVisible: false, currentMode: 'flashcard', quizHistory: [],
  activeStrategySetting: 'all', globalPersistentEyeToggleStatus: false,
  answerTimer: null
};
