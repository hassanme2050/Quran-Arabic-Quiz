import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseTajweedBook,tajweedChoices} from '../shared/tajweed.js?v=1029.26-strawberry5';
import {loadBook,BOOK_FILES} from '../shared/vocabulary.js?v=1029.26-strawberry5';
import {parseEditorBook,replaceTajweedRecord} from '../editor/js/book.js?v=1029.26-editor7';
import {saveVocabularyRecord,repositoryVocabularyPath} from '../editor/js/github.js?v=1029.26-editor7';
import {createQuestLibraryStorage,parseQuestBackup} from '../js/quest-storage.js?v=1029.26-strawberry5';
import {buildQuestPlan,beginQuestNode,advanceQuestReview} from '../js/quest-model.js?v=1029.26-strawberry5';
const source=fs.readFileSync(new URL('../Tajweed-Question-Bank.txt',import.meta.url),'utf8');
const records=parseTajweedBook(source).records;
test('real Tajweed library preserves all 680 questions, 11 categories, 62 subcategories and bilingual answer commas',()=>{
    assert.equal(records.length,680);assert.deepEqual(records.map(r=>r.number),Array.from({length:680},(_,i)=>i+1));
    assert.equal(new Set(records.map(r=>r.category.number)).size,11);assert.equal(new Set(records.map(r=>r.subcategory.number)).size,62);
    assert.equal(records[0].meaning,'التحسين, Beautification');assert.equal(records[0].wrongAnswers[0],'الإقلاب, Conversion');
    assert.deepEqual(parseTajweedBook(source).warnings,[]);
    const lines=source.split(/\r?\n/);
    for(const record of records){assert.equal(record.wrongAnswers.length,6);assert.equal(record.verified,true);assert(lines[record.sourceLine-1].includes(record.word+' ⟶ '+record.meaning+' ⟹ '+record.wrongAnswers.join(' - ')));}
});
test('Tajweed parsing rejects missing, duplicate and overlapping answers and duplicate IDs',()=>{
    const row='1) Question? ⟶ Correct ⟹ One - Two - Three - Four - Five - Six';
    for(const text of [row.replace(' - Six',''),row.replace('Six','Correct'),row.replace('Six','One'),row.replace('Correct',''),row+'\n'+row])assert.throws(()=>parseTajweedBook(text));
    const parsed=parseTajweedBook('═══ ༻ 01 Main ༺ ═══\n─── ༻ 001 Sub ༺ ───\n'+row+'\n═══ ༻ 02 New main ༺ ═══\n'+row.replace('1)','2)'));
    assert.equal(parsed.records[1].subcategory,null);assert.equal(parsed.records[1].category.number,2);
});
test('every attempt draws exactly three distinct wrong answers from that question and shuffles the correct position',()=>{
    const before=JSON.stringify(records[0]),positions=new Set(),subsets=new Set(),seen=new Set();let seed=12345;
    const random=()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
    for(let i=0;i<200;i++){
        const answers=tajweedChoices(records[0],random).map(item=>item.meaning);
        assert.equal(answers.length,4);assert.equal(new Set(answers).size,4);assert.equal(answers.filter(a=>a===records[0].meaning).length,1);
        positions.add(answers.indexOf(records[0].meaning));const wrong=answers.filter(a=>a!==records[0].meaning);
        wrong.forEach(a=>{assert(records[0].wrongAnswers.includes(a));seen.add(a);});subsets.add(wrong.sort().join('|'));
    }
    assert.equal(positions.size,4);assert.equal(seen.size,6);assert(subsets.size>10);assert.equal(JSON.stringify(records[0]),before);
});
test('Editor updates the question and seven answers without changing other lines, Unicode, headings or line endings',()=>{
    for(const eol of ['\n','\r\n','\r']){
        const text='\uFEFF'+source.replace(/\r?\n/g,eol),expected=records[0];
        const updated={word:expected.word+' Reviewed?',meaning:expected.meaning+' (reviewed)',wrongAnswers:expected.wrongAnswers.map((a,i)=>i===5?a+' (reviewed)':a)};
        const result=replaceTajweedRecord(text,1,expected,updated),before=text.split(eol),after=result.split(eol);
        assert.equal(after.length,before.length);before.forEach((line,i)=>{if(i!==expected.sourceLine-1)assert.equal(after[i],line);});
        assert(result.startsWith('\uFEFF'));const saved=parseEditorBook(result,'book_c');assert.equal(saved.records.length,680);assert.equal(saved.availableCount,680);
        assert.equal(saved.records[0].meaning,updated.meaning);assert.deepEqual(saved.records[0].wrongAnswers,updated.wrongAnswers);
        assert.throws(()=>replaceTajweedRecord(result,1,expected,updated),/changed/);
        assert.throws(()=>replaceTajweedRecord(text,1,expected,{...updated,wrongAnswers:updated.wrongAnswers.slice(1)}),/six wrong/);
    }
});
test('Book C loads the shared online TXT and GitHub saves target only its question bank',async t=>{
    const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
    globalThis.fetch=async url=>{assert(String(url).endsWith('/Tajweed-Question-Bank.txt'));return {ok:true,text:async()=>source};};
    assert.equal((await loadBook('book_c')).length,680);assert.equal(BOOK_FILES.book_c,'Tajweed-Question-Bank.txt');
    assert.equal(repositoryVocabularyPath(BOOK_FILES.book_c,'https://hassanme2050.github.io/Quran-Arabic-Quiz/Test/editor/js/github.js'),'Test/Tajweed-Question-Bank.txt');
    let remote=source,puts=0;
    globalThis.fetch=async(url,options)=>{
        assert(String(url).includes('/contents/Tajweed-Question-Bank.txt'));assert(!String(url).includes('Vocabulary-File.txt'));
        if(options.method!=='PUT')return {ok:true,json:async()=>({sha:'current-sha',content:Buffer.from(remote).toString('base64')})};
        const body=JSON.parse(options.body);assert.equal(body.sha,'current-sha');remote=Buffer.from(body.content,'base64').toString('utf8');puts++;return {ok:true};
    };
    await saveVocabularyRecord({filename:BOOK_FILES.book_c,token:'test-only',number:1,expected:records[0],updated:{...records[0],meaning:'Reviewed answer'}});
    assert.equal(puts,1);assert.equal(parseTajweedBook(remote).records[0].meaning,'Reviewed answer');
    await assert.rejects(()=>saveVocabularyRecord({filename:BOOK_FILES.book_c,token:'test-only',number:1,expected:records[0],updated:records[0]}),/changed/);assert.equal(puts,1);
});
test('all three books export in one file and old two-book backups preserve Tajweed progress',()=>{
    const data=new Map(),storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
    const library=createQuestLibraryStorage(storage,'library','legacy'),c=library.loadBook('book_c',680);
    const plan=buildQuestPlan(680);beginQuestNode(plan,c,'stage-1',a=>a);advanceQuestReview(c,'stage-1',a=>a);library.save(c);
    const backup=library.backup();assert.deepEqual(Object.keys(backup.books),['book_a','book_b','book_c']);
    const imported=parseQuestBackup(JSON.stringify(backup),{book_a:98,book_b:20,book_c:680});
    const fresh=createQuestLibraryStorage(storage,'new-library','none');fresh.importBooks(imported);assert.equal(fresh.loadBook('book_c',680).runs['stage-1'].reviewIndex,1);
    delete backup.books.book_c;fresh.importBooks(parseQuestBackup(JSON.stringify(backup),{book_a:98,book_b:20,book_c:680}));
    assert.equal(fresh.loadBook('book_c',680).runs['stage-1'].reviewIndex,1);
});
