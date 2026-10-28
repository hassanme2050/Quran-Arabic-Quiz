import test from 'node:test';
import assert from 'node:assert/strict';
import { searchDictionary, normalizeSearch } from '../js/dictionary-search.js';

test('Arabic exact, vowel/shadda variants, prefix, middle and end ranking', () => {
    const items = ['سَلَام', 'لَهُ', 'عَلَم', 'ل', 'إِلَّا', 'اِلَا', 'إِلّا'].map((word, originalIndex) => ({word,originalIndex}));
    assert.deepEqual(searchDictionary(items,'ل','arabic').map(x=>x.word), ['ل','لَهُ','سَلَام','عَلَم','إِلَّا','اِلَا','إِلّا']);
    assert.equal(searchDictionary(items,'إِلَّا','arabic')[0].word, 'إِلَّا');
    assert.equal(searchDictionary(items,'الا','arabic').filter(x=>normalizeSearch(x.word)==='الا').length,3);
    assert.equal(searchDictionary(items,'illa','arabic').filter(x=>normalizeSearch(x.word)==='الا').length,3);
    assert.equal(searchDictionary(items,'laam','arabic')[0].word,'ل');
});

test('Unicode forms, Urdu letter variants, tatweel and digit scripts', () => {
    assert.equal(normalizeSearch('إِلَّـا'),normalizeSearch('اِلا'));
    assert.equal(normalizeSearch('ﻻ'),normalizeSearch('لا'));
    assert.equal(normalizeSearch('کی'),normalizeSearch('كي'));
    assert.equal(normalizeSearch('١۲۳'), '123');
    const items=[{number:12},{number:2},{number:20},{number:102}];
    assert.deepEqual(searchDictionary(items,'۰۰۲','number').map(x=>x.number),[2]);
    assert.deepEqual(searchDictionary(items,'2','number').map(x=>x.number),[2,20,12,102]);
});

test('meaning search ranks exact ahead of word boundaries, substrings and close spellings', () => {
    const items=['the book','booking','book','cook','notebook'].map(meaning=>({meaning}));
    assert.deepEqual(searchDictionary(items,'book','english').map(x=>x.meaning),['book','booking','the book','notebook','cook']);
    assert.equal(searchDictionary([{meaning:'کتاب',explanation:'(قرآن کی کتاب)'}],'کتاب','english').length,1);
    assert.equal(searchDictionary([{meaning:'کتاب',explanation:'(قرآن کی کتاب)'}],'قرآن','english').length,1);
});

test('empty and no-match queries, duplicate numbers, and immutable source order', () => {
    const items=[{number:952,word:'ا'},{number:952,word:'ب'}];
    const before=JSON.stringify(items);
    assert.equal(searchDictionary(items,'  ','arabic'),items);
    assert.equal(searchDictionary(items,'952','number').length,2);
    assert.equal(searchDictionary(items,'zzzzzz','arabic').length,0);
    assert.equal(JSON.stringify(items),before);
});
