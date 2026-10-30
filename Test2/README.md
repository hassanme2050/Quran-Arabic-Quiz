# Quran Arabic Quiz — Strawberry v1030.26

Development preview: GitHub `Test2/`. Production at the repository root remains Peaches.

Book D - Quran Vocabulary (Arabic to English) reads `Quran-Vocabulary-Meaning-Arabic-English.txt` in Review only. Headings use the category/subcategory format; each row is `word = meaning => label chapter:verse, label chapter:verse`. Details preserves the reference order and shows one Arabic ayah with Saheeh International English translation via the public Al Quran Cloud API, with attribution, previous/next navigation, retry and return to the same flashcard/reveal state. Successful verses are cached for the current visit. No teacher token or password is sent to the verse service. The supplied reference labels are displayed as authored; the app does not infer or validate a word-to-verse semantic match.

Book C - Quran Tajweed reads `Tajweed-Question-Bank.txt` through the shared online loader. Student Quiz, Review, Dictionary and Quest support its category/subcategory metadata, questions and answers. Quiz choices contain one correct answer and three distinct wrong answers sampled from that question's six, in shuffled order. Editor exposes every question, correct answer and six wrong answers and saves just the selected source row with conflict detection. Quiz, Review and Quest use only questions before the first `-----`; Dictionary includes all questions. Without a marker, Book C is dictionary-only. Editor Make available moves the marker forward after the current question, preserving corrections and never reducing student availability. Book C Test Generator/teacher codes are deferred. Quest backups include all three books and accept older one/two-book backups.

Deployment must exclude `Vocabulary-File.txt`, `Lughat-AlQuran-word-meaning.txt` and `CP.txt`. GitHub Book A is authoritative; never overwrite it from a local code upload. If a local Book A copy has more entries than GitHub, confirm with the user before any data replacement. Add a new book file only when authorized and absent remotely; subsequent code deployments must preserve it too.

Peaches (QuranAQ-v1026.26) starts as a clone of production Pineapple. Copied Android files and APKs remain Pineapple artifacts; no Peaches Android build has been created.

Serve this folder over HTTP; opening index.html with a file:// URL cannot reliably load vocabulary or JavaScript modules.

With Node.js installed, run from this folder:

    node serve.cjs

Then open http://127.0.0.1:8124. Stop with Ctrl+C.

## Files

- index.html: screen structure and declarative action bindings.
- css/app.css: existing styles, including dictionary and small-screen layout.
- js/app.js: startup, menu controls and session selection.
- js/state.js: shared session state and pending answer timer.
- js/vocabulary.js: fresh vocabulary loading and parsing in original book order.
- js/quiz.js: original answer generation, teacher-code decoding, questions and results.
- js/flashcards.js: review and meaning visibility.
- js/dictionary.js: sorting, dictionary rendering and touch jump navigation.
- js/ui.js: screen switching, exit cleanup and notifications.
- js/utils.js: existing random sampling and shuffle helpers.
- js/platform.js: browser scorecard export adapter, ready for future device adapters.

Update Vocabulary-File.txt in place. Existing book numbers, words and meanings must remain fixed. Teacher codes continue to reference the original one-based book order, independent of dictionary display sorting. Vocabulary is fetched without persistent caching each page visit; dictionary caches last only for the current visit.

Scorecard export loads the bundled html2canvas 1.4.1 when requested. Desktop image clipboard support is available; Android clipboard support is deferred and PNG downloading is accepted for now. No new mobile package is included yet.

Arabic typography is shared in shared/typography.css and uses Alexandria from Google Fonts (weights 400, 600 and 700). Arabic words, result rows, dictionary letters, Generator tiles and Editor input use this family; English interface text retains its existing font. Google Fonts requires a network connection on first load; bundle the font when preparing offline mobile packages.

## Teacher tools

- editor/index.html: Word Editor, with its own css and js folders.
- test-generator/index.html: 20-question Test Generator, with its own css and js folders.
- Editor.html and Test-Generator.html redirect to these pages for existing links.
- shared/vocabulary.js: identical book mapping, root-relative file loading and parsing for all three tools.
- shared/quiz-codes.js: shared encoding/decoding; Generator makes 20-question codes, student quiz accepts both old 10-question and new 20-question codes. Regular menu sessions still use 10 words.
- shared/ui.js: shared toast notifications and teacher-tool action bindings.

The code format keeps the original sorted three-digit book-number sequence converted to hexadecimal. Each number must be 1–999; existing book numbers and library text remain unchanged. Codes contain no book identity, matching the existing format. Only Book A is enabled.

Editor retains its existing login rules; Test Generator still reads CP.txt. Editor Save writes to GitHub main with the supplied token. On GitHub Pages it follows the app folder: a TEST deployment reads and saves TEST/Vocabulary-File.txt; the root deployment reads and saves Vocabulary-File.txt. Local previews retain the repository-root save destination. It verifies the loaded record against GitHub and uses the latest file SHA to prevent conflicts. Editing a different target number requires GO before saving. No automatic local-library synchronization occurs.

Generator keeps selection across pages, prevents a 21st question, and requires exactly 20 before code generation. Clicking a tile updates only that tile and the counter. Reopening/reloading starts fresh.

All session changes and verification notes belong in the parent Quran Arabic Quiz Version-History.txt file.

## Verification

Run `node --test tests/flows.test.mjs` for shared code compatibility, 20-question selection across pages, 10/20 student quiz completion, dictionary order, mocked Editor saves/conflicts, and local HTTP routes. These checks use a small DOM harness; they do not replace visual testing in a browser. GitHub writes are mocked in tests.

## Peaches Book B

Book B reads Lughat-AlQuran-word-meaning.txt unchanged. Its parser retains source numbers, Juzz/Surah metadata, Urdu meanings and trailing parenthesized explanations. Quiz/review/distractors and the Generator use only words above the first five-dash verification line. Dictionary includes all records, with unverified rows subdued. Without a verification line, Book B is dictionary-only. Explanations appear inline with meanings in Review and Dictionary, separately from quiz answers. Per-word source metadata and verification labels are not displayed. Book A and its legacy codes are unchanged. Book B teacher codes use B2: followed by 10 or 20 four-digit source numbers separated by dots; choose Book B before entering them. Book B Editor exposes all source entries, retains source IDs/headings/Urdu notes and saves only the selected entry. No Peaches Android build is included.

Dictionary live search: tap the fourth keyboard-icon button to expand and focus the search field; sort controls animate into compact squares. Input opens the native device keyboard. The page sets ar/ur/en language, direction and text input hints; browser/OS controls the actual keyboard language. No custom keyboard is rendered. Search updates without Enter; close or Escape clears and collapses the field. Matching and numeric/Arabic/Urdu normalization are unchanged. Run node --test tests/flows.test.mjs tests/lughat.test.mjs tests/dictionary-search.test.mjs.

Search is independent of the selected sort: every query searches Arabic words, English/Urdu meanings, explanations and original word numbers together. Sort changes preserve the query; relevance ties follow source order. Keyboard language hints still follow the selected sort.

Dictionary options are mutually exclusive: opening search selects only the keyboard control. Selecting Number, English/Urdu or Arabic clears/collapses search, blurs the input to dismiss the native keyboard and selects only that sort. The close icon is removed. Escape returns to the last sort. This supersedes the earlier query-retention behavior.

Production release: the user-approved Peaches build is published at https://hassanme2050.github.io/Quran-Arabic-Quiz/ . Generator: test-generator/index.html; Editor: editor/index.html. The former Test/ preview has been removed. Future feature previews will be deployed to a new Test/ folder, separately from the approved production version. The Peaches production workflow verifies root files and saves browser screenshots under artifacts/.

## October 29 Quest layout
- Shared gold/teal buttons match the other modes.
- The map scrolls left to right and opens focused on the current stage.
- Removed the introductory header, map legends and how-to section.
- Words to strengthen uses the Quiz performance-table format.
- Overall progress sits immediately above Export/Import.
- Quest supports Book A and verified Book B words, with a book selector, independent stages and saved positions, Urdu meanings and original Book B word numbers.
- Export progress backs up both books in one JSON file. Import restores both together; older single-book backups restore only their book and preserve the other book. Existing browser Book A saves migrate automatically.
- Book B Editor is enabled for all entries, including unverified words. Repeated source numbers remain accessible in source order with Previous/Next. Urdu meanings and parenthesized notes are edited together.
- Editor login uses the configured passwords in CP.txt, with visible validation errors, Enter-key submission and retry after file-loading errors. A GitHub token is still required for saving edits. GO and Enter load the typed word number.

## Book B student availability
Save corrections with Save Changes. The Make available button sits directly under Save Changes. It checks the marker location in the latest GitHub file and moves it to the line immediately after the selected entry only when the old marker is before that entry. Equal or earlier targets make no commit. Unsaved edits must be saved first; concurrent changes are detected. The operation preserves the rest of the source text and uses the app folder as its GitHub save destination.

The Arabic field uses its original Peaches sizing, line spacing and padding. Font size controls have been removed.

## Named quiz-code tests
A valid quiz code opens participant name entry. Start shows 3-2-1; elapsed timing runs from the first question to the final answer. The scorecard includes name, date, total time, score and quiz code. Copy Image writes PNG to the clipboard; blocked clipboard access downloads the image. Save Image and native Share Image are also available. Participant details stay in the current session.
