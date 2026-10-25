# Quran Arabic Quiz — Strawberry
Version folder: QuranAQ-v1025.26 Strawberry. Status: Not Tested until user confirmation.

This version uses Pineapple as its web base and adds Quest Mode. No Android project or APK is included.

## Quest Mode
- Regular stages follow the original book order, with 10 words per stage. The last stage uses the remaining words.
- Review cards show the word and meaning, one at a time, in book order. The same words are shuffled for the quiz.
- 60% earns one star, 80% two and 100% three. One star is required to unlock the next stop. Failed stages can be reviewed and retried; best stars and unlocked stages are retained.
- A dragon checkpoint appears after every five regular stages and gates the next stage. It tests 25 unique previously learned words, prioritizing recent and repeated mistakes; remaining slots use the least-secure learned words. Dragon quizzes start directly without a review round.
- Progress saves after every review step and answer using localStorage. It is local to this browser, device, book and app URL—not an account or cross-device sync.
- Incomplete stages resume in place. Export/import progress provides a JSON backup. If storage is blocked or full, the UI warns and the current tab can still be used.
- Per-word correct/incorrect counts, review exposure, correct streaks and recent mistakes support adaptation. The map's Words to strengthen panel shows the leading trouble words.
- New vocabulary appended to the book adds stages without clearing older achievements. If a partial last stage gains words, that stage reopens so the added words are learned.
- Stage categories are not implemented in this phase. Centralized Android vocabulary updates remain a separate future task.

## Existing modes and teacher tools
Quiz, Review, Dictionary, Editor and Test Generator retain Pineapple behavior. Answer-choice generation and meaning matching are unchanged. Teacher codes still support 10 or 20 questions; the Generator creates 20-question codes. Book numbering, vocabulary and CP contents remain unchanged.
Shared vocabulary and CP paths follow the application folder. On GitHub Pages, Editor's save target follows that same folder; in /Test/ it saves Test/Vocabulary-File.txt. Local preview Editor retains its repository-root save destination.

## Preview and verification
Serve over HTTP, rather than double-clicking index.html:
    node serve.cjs
Open http://127.0.0.1:8124.

Pure rule tests:
    node --test tests/quest.test.mjs
Existing behavior and HTTP checks:
    node --test tests/flows.test.mjs
tests/quest.browser.mjs runs real Chromium UI checks when Playwright is available. tests/strawberry-workflow.yml is the GitHub workflow source for desktop/mobile testing and screenshots. It does not build Android packages.
Alexandria loads from Google Fonts; scorecard export loads html2canvas when requested.
All work summaries belong at the top of the parent Quran Arabic Quiz Version-History.txt file.
