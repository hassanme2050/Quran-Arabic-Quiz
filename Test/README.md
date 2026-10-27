# Quran Arabic Quiz — Peaches

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

Scorecard export loads html2canvas 1.4.1 from jsDelivr only when requested and needs network access. Bundle this dependency when preparing an offline Android/iOS package. No mobile package is included yet.

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

Book B reads Lughat-AlQuran-word-meaning.txt unchanged. Its parser retains source numbers, Juzz/Surah metadata, Urdu meanings and trailing parenthesized explanations. Quiz/review/distractors and the Generator use only words above the first five-dash verification line. Dictionary includes all records, with unverified rows subdued and labeled. Without a verification line, Book B is dictionary-only. Explanations appear in Review and Dictionary, separately from quiz answers. Book A and its legacy codes are unchanged. Book B teacher codes use B2: followed by 10 or 20 four-digit source numbers separated by dots; choose Book B before entering them. Book B remains disabled in the Editor until its format can be edited without rewriting the source. No Peaches Android build is included.
