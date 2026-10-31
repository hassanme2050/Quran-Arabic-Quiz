import {fixtureBook} from './library-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseQuranVocabulary} from '../shared/quran-vocabulary.js?v=1030.26-dates3';
import {createVerseLoader,parseVerseResponse} from '../shared/quran-verses.js?v=1030.26-dates3';
import {replaceQuranVocabularyRecord} from '../editor/js/book.js?v=1030.26-dates-editor2';
import {encodeQuizCode,decodeTeacherQuizCode} from '../shared/quiz-codes.js?v=1030.26-dates3';
const source=fixtureBook("Quran-Vocabulary-Meaning-Arabic-English.txt");
const reference={surah:12,ayah:34,key:'12:34'};
test('Book D Editor saves references and rejects stale or invalid changes while preserving other source rows',()=>{
    const record=parseQuranVocabulary(source).records[0],updated={word:record.word,meaning:'Reviewed meaning',referenceText:'Example 2:255, Another 10: 10'};
    const result=replaceQuranVocabularyRecord(source,1,record,updated),saved=parseQuranVocabulary(result).records;
    assert.equal(saved[0].references[1].key,'10:10');assert.equal(saved[0].meaning,'Reviewed meaning');
    assert.deepEqual(saved.slice(1),parseQuranVocabulary(source).records.slice(1));
    assert.throws(()=>replaceQuranVocabularyRecord(result,1,record,updated),/changed/);
    assert.throws(()=>replaceQuranVocabularyRecord(source,1,record,{...updated,referenceText:'Invalid reference'}),/reference/);
});
test('Book D codes identify their book and preserve the existing 10/20 question counts',()=>{
    for(const count of [10,20]){const ids=Array.from({length:count},(_,i)=>i+1),code=encodeQuizCode(ids,'book_d');assert(code.startsWith('D4:'));assert.deepEqual(decodeTeacherQuizCode(code),ids);}
});
export const verseFixture=(surah=12,ayah=34)=>({code:200,data:[
    {surah:{number:surah,englishName:'Test chapter'},numberInSurah:ayah,text:'نص عربي للاختبار',edition:{identifier:'quran-uthmani'}},
    {surah:{number:surah},numberInSurah:ayah,text:'English test translation '+surah+':'+ayah,edition:{identifier:'en.sahih',englishName:'Saheeh International'}}
]});
test('Book D preserves category sections, repeated words, meanings and ordered reference labels',()=>{
    const {records,warnings}=parseQuranVocabulary(source);assert.equal(records.length,9);assert.deepEqual(warnings,[]);
    assert.deepEqual(records.map(r=>r.number),[1,2,3,4,5,6,7,8,9]);assert.equal(records[0].word,records[3].word);assert.notEqual(records[0].category,records[3].category);
    assert.equal(records[0].meaning,'This, That, What');assert(!records[0].meaning.includes('=>'));
    assert.deepEqual(records[0].references.map(r=>[r.meaning,r.key]),[['This','12:34'],['This','34:32'],['That','43:44'],['What','55:10']]);
    assert.equal(records[2].references[1].key,'10:10');assert.equal(records[0].category.name,'Main Category');assert.equal(records[0].subcategory.name,'Sub Category');
});
test('Book D handles BOM/line endings, optional references, heading reset and rejects malformed reference data',()=>{
    const text='\uFEFF═══ ༻ Main ༺ ═══\r\n─── ༻ Sub ༺ ───\r\nword = meaning => two words 10: 10, second 2 : 3\r\n═══ ༻ Next ༺ ═══\r\nword = plain meaning';
    const records=parseQuranVocabulary(text).records;assert.equal(records[0].references[0].meaning,'two words');assert.equal(records[0].references[1].key,'2:3');assert.equal(records[1].subcategory,null);assert.deepEqual(records[1].references,[]);
    for(const row of ['word = meaning => bad','word = meaning => this 0:1','word = meaning => this 115:1','word = meaning => this 1:0','word = meaning => this 1:1,','word = => this 1:1'])assert.throws(()=>parseQuranVocabulary(row));
});
test('verse responses require both exact requested editions and exact chapter/ayah identity',()=>{
    const parsed=parseVerseResponse(verseFixture(),reference);assert.equal(parsed.key,'12:34');assert(parsed.arabic);assert(parsed.english);
    for(const data of [verseFixture(12,35),{code:200,data:[verseFixture().data[0]]},{code:500,data:verseFixture().data}])assert.throws(()=>parseVerseResponse(data,reference),/requested/);
});
test('verse loader caches successful references and uses the official alternate host on failure',async()=>{
    const urls=[];const load=createVerseLoader(async(url,options)=>{urls.push(url);assert(options.signal);if(url.includes('api.alquran.cloud'))throw new Error('Primary unavailable');return {ok:true,json:async()=>verseFixture()};});
    const signal=new AbortController().signal;assert.equal((await load(reference,{signal})).key,'12:34');await load({...reference,meaning:'Another label'},{signal});
    assert.equal(urls.length,2);assert(urls[1].startsWith('https://alquran.api.islamic.network/'));assert(urls[1].endsWith('/v1/ayah/12:34/editions/quran-uthmani,en.sahih'));
});
test('failed verse loads can retry, invalid responses are never cached and aborted requests never cache',async()=>{
    let fail=true,calls=0;const load=createVerseLoader(async()=>{calls++;return {ok:true,json:async()=>fail?verseFixture(1,1):verseFixture()};});
    await assert.rejects(()=>load(reference),/requested/);fail=false;await load(reference);assert.equal(calls,3);
    const controller=new AbortController();let requests=0;
    const aborted=createVerseLoader(async()=>{requests++;controller.abort();return {ok:true,json:async()=>verseFixture()};});
    await assert.rejects(()=>aborted(reference,{signal:controller.signal}),/Aborted/);assert.equal(requests,1);
});
