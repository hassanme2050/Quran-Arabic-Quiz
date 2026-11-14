import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeArabicAnswer, arabicAnswersMatch, spellingEntries} from '../shared/spelling.js';
import {defaultSettings, validateSettings} from '../shared/dashboard-settings.js';

test('Arabic vowel marks, tanwin, shadda, madd and Quranic marks are optional', () => {
    for (const [answer, expected] of [
        ['بيت','بَيْتٌ'], ['بَيْتًا','بيتا'], ['بيت','بَيتٍ'], ['مد','مَدّ'],
        ['هذا','هَٰذَا'], ['آدم','آدَمُ'], ['ادم','آدَمُ'],
        ['قمر','ٱلْقَمَرُ'], ['الرَّحْمَٰنُ','رحمن'], ['مد','مۤد']
    ]) assert(arabicAnswersMatch(answer, expected), answer + ' should match ' + expected);
});
test('the optional article works on either side and Arabic typing accepts Book B letter shapes', () => {
    assert(arabicAnswersMatch('قمر','القمر'));
    assert(arabicAnswersMatch('الْقَمَرُ','قمر'));
    assert(arabicAnswersMatch('رب عالمين','رَبِّ الْعَالَمِیْنَ'));
    assert(arabicAnswersMatch('رحيم','رَحِیْمٌ'));
    assert(arabicAnswersMatch('كتاب','کِتَابٌ'));
    assert(arabicAnswersMatch('هداية','ہِدَایَۃٌ'));
});
test('actual spelling mistakes, Latin answers and empty/mark-only answers are rejected', () => {
    for (const answer of ['', 'َُّ', 'alqamar', 'moon', '123', 'قمرر', 'بيت'])
        assert(!arabicAnswersMatch(answer, 'قمر'));
    assert(!arabicAnswersMatch('علي','على'));
    assert(!arabicAnswersMatch('مدرسه','مدرسة'));
    assert(!arabicAnswersMatch('سال','سأل'));
    assert.equal(normalizeArabicAnswer('  بَـيْتٌ  '), 'بيت');
});
test('book word alternatives can be answered individually without requiring source punctuation', () => {
    assert(arabicAnswersMatch('يمين','يَمِين / أَيْمَان'));
    assert(arabicAnswersMatch('أيمان','يَمِين / أَيْمَان'));
    assert(arabicAnswersMatch('لماذا','لِمَ ، لِمَاذَا'));
    assert(arabicAnswersMatch('ني','يِي (نِي)'));
    assert(arabicAnswersMatch('ألا','أَلَّا (أَنْ + لَا)'));
    assert(!arabicAnswersMatch('أن','أَلَّا (أَنْ + لَا)'));
});
test('spelling uses verified words and only the Arabic term from bilingual Tajweed answers', () => {
    const records=[
        {word:'A question',meaning:'التحسين, Beautification',verified:true},
        {word:'Another question',meaning:'المخرج, Makhraj (Articulation point)',verified:true},
        {word:'English question',meaning:'Doing something well',verified:true},
        {word:'Unreleased',meaning:'الصفات, Sifaat (Letter qualities)',verified:false}
    ];
    const entries=spellingEntries(records,'book_c');
    assert.deepEqual(entries.map(x=>[x.spellingPrompt,x.spellingAnswer]),[
        ['Beautification','التحسين'],['Articulation point','المخرج']
    ]);
    assert.deepEqual(records.map(x=>x.meaning),[
        'التحسين, Beautification','المخرج, Makhraj (Articulation point)','Doing something well','الصفات, Sifaat (Letter qualities)'
    ]);
});
test('Book B spelling omits root hints without removing the Urdu meaning', () => {
    const [entry]=spellingEntries([{word:'اَعُوْذُ',meaning:'پناہ مانگنا (ع و ذ)'}],'book_b');
    assert.equal(entry.spellingPrompt,'پناہ مانگنا');
    assert.equal(entry.spellingAnswer,'اَعُوْذُ');
});
test('legacy dashboard settings gain Spelling without losing book or mode restrictions', () => {
    const legacy=defaultSettings();
    for (const row of Object.values(legacy.books)) delete row.spelling;
    legacy.books.book_b.state='hide';legacy.books.book_c.quiz='disable';
    const current=validateSettings(legacy);
    assert(Object.values(current.books).every(row=>row.spelling==='enable'));
    assert.equal(current.books.book_b.state,'hide');
    assert.equal(current.books.book_c.quiz,'disable');
    assert(!Object.hasOwn(legacy.books.book_a,'spelling'));
});
test('Admin Spelling states stay strict and accept enable, disable or hide', () => {
    const settings=defaultSettings();
    settings.books.book_a.spelling='disable';settings.books.book_b.spelling='hide';
    assert.deepEqual(validateSettings(settings),settings);
    settings.books.book_c.spelling='off';
    assert.throws(()=>validateSettings(settings),/book_c \/ spelling/);
});
