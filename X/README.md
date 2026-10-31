# QuranAQ

Local-only portability fork of QuranAQ-v1030.26 Strawberry. Dates has not been uploaded to GitHub. Normal feature development continues in the Strawberry folder and GitHub Test2.

Open `index.html` for the Student app, `Editor.html` for the Editor, or `Test-Generator.html` for the Generator. These three files contain their own JavaScript and styles. The separate Admin module is `admin/index.html`, which also embeds its JavaScript and styles. Each may be copied, moved or renamed independently; the other folders are not needed to run a finished HTML file. Preserve the `.html` extension.

An internet connection is required. All four books are read fresh from `hassanme2050/Quran-Arabic-Quiz`, branch `main`, folder `Test2`:

- Vocabulary-File.txt
- Lughat-AlQuran-word-meaning.txt
- Tajweed-Question-Bank.txt
- Quran-Vocabulary-Meaning-Arabic-English.txt

Editor and Generator password configuration is read from Test2/CP.txt. Editor corrections and verification-marker updates always target those same Test2 book files, even if Dates is opened from a USB drive, renamed file, localhost or another website. Saves still require the user's GitHub token and check the latest file revision. No token or password is embedded in the HTML files.

Verse details still fetch Arabic and English from Al Quran Cloud. Google Fonts is optional for appearance; fallback fonts are available. Screenshot rendering is embedded in the Student HTML.

Book D Quest review and question cards also have the ayah information icon. Closing the overlay returns to the same Quest card without advancing or changing progress.

Quest progress uses a Dates-specific storage key. Export/import progress to move between browsers or computers, or to transfer Strawberry progress; browser storage itself is not part of an HTML file.

`source/` contains the editable fork. `source/tests/fixtures/library.json` is an isolated test snapshot, not runtime book data. Change the fixed library location in `source/shared/library-config.js` only if the actual GitHub library is relocated.

Rebuild the finished HTML files with:

    node build-portable.cjs

Run the packaged-file checks with:

    node --test portable.test.cjs

The packer supports this project's named ES-module imports/exports, including live bindings and circular imports. It embeds trusted project modules as JavaScript functions, so a web host with a restrictive Content Security Policy must permit inline scripts and function compilation. Opening the local files does not add such a host policy.

Verification: 62 source regression tests and 17 packaged-file tests passed. Packaged tests execute the actual generated JavaScript in an isolated DOM harness at simulated file/HTTP/HTTPS locations, including Editor saves and Generator code creation. Real browser verification was unavailable because computer use stopped when it could not verify the browser URL. No GitHub data was changed during testing.

Dates admin dashboard (October 31, 2026)

Open `admin/index.html` directly. On a web host, placing the `admin` folder beside the Student index makes it available at `/admin/` (under the same deployment base path). The Student app has no Admin link, login or dashboard code. Sign in with the existing Editor password and a GitHub token with Contents read/write access to the library repository. The dashboard has four book rows and Availability, Review, Quiz, Quest, Dictionary and Quiz Code columns. Tap cells to cycle green Enable, red Disable and gray Hide. Disabling or hiding a book overrides its feature cells without erasing their individual values. Save updates GitHub Test2/dbs.json and keeps you signed in. Cancel reloads the current saved configuration without signing out; Sign out discards unsaved changes without writing. The student home screen checks settings on focus and every 15 seconds, using the GitHub Contents API with a fresh request URL and a raw-file fallback. A running session is left in place; its home screen is updated on return. Hidden books are removed from both Student and Quest pickers rather than relying on native option hiding. Strawberry does not read this file. Tokens/passwords are held only during the admin session and are cleared when signing out; concurrent file changes prevent a stale save.

If settings cannot be fetched, Dates uses its last valid cached settings. Without a valid cache, features remain disabled; Admin is accessed separately. Hiding Quiz Code hides its entire row, including Go. Seven Go clicks unlock the configured books and modes until reload, without writing dbs.json or bypassing book verification markers/passwords. Book C dictionary and C3 quiz-code input can be enabled; the Generator still does not offer Book C.

Only the shared settings data file was added to GitHub for this update. Dates HTML/source remain local. Existing Android APKs predate this dashboard update and were not rebuilt.

Student layout: the three study options, optional custom range, and paired Review/Quiz buttons share one compact group without a surrounding box. Small equal gaps separate that group, Quest, and Dictionary. Admin uses native emoji for Enable, Disable and Hide. Neither Dates nor the Admin module has been uploaded.
