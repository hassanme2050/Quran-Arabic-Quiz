import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseEditorBook,replaceLughatRecord,moveVerificationBoundary} from '../editor/js/book.js?v=1029.26-editor8';
import {saveVocabularyRecord,saveVerificationBoundary,repositoryVocabularyPath} from '../editor/js/github.js?v=1029.26-editor8';
import {withVerificationAt} from './book-b-fixture.mjs';

const source=withVerificationAt(fs.readFileSync(new URL('../Lughat-AlQuran-word-meaning.txt',import.meta.url),'utf8'),20);
const row=(n,word='word'+n,meaning='meaning'+n)=>String(n).padStart(4,'0')+' '+word+' \u27F5 '+meaning;
const record=(text,n,occurrence=1)=>parseEditorBook(text,'book_b').records.find(item=>item.number===n&&item.occurrence===occurrence);
const nonMarkers=text=>text.split(/\r\n|\n|\r/).filter(line=>!/^\s*-{5,}(?:\s.*)?$/.test(line));

test('Book B editor reads every real entry and saves one line without rewriting Unicode, headings or notes',()=>{
    const parsed=parseEditorBook(source,'book_b');
    assert.equal(parsed.records.length,1858);assert.equal(parsed.availableThrough,20);
    assert(parsed.records.some(item=>item.occurrence>1));
    const expected=record(source,24),updated={word:expected.word+'ا',meaning:expected.rawMeaning+' (تجربہ)'};
    const saved=replaceLughatRecord(source,24,expected,updated),lines=source.split(/\r\n|\n|\r/),out=saved.split(/\r\n|\n|\r/);
    assert.equal(lines.length,out.length);
    assert.equal(lines.filter((line,i)=>line!==out[i]).length,1);
    assert.equal(record(saved,24).word,updated.word);assert.equal(record(saved,24).rawMeaning,updated.meaning);
    assert.equal(parseEditorBook(saved,'book_b').availableThrough,20,'saving a correction must not publish it');
    assert.equal((saved.match(/^-----$/gm)||[]).length,(source.match(/^-----$/gm)||[]).length);
});
test('Book B replacement preserves BOM, CRLF, padded source IDs, separators and duplicate entry identity',()=>{
    const text='\uFEFFheading\r\n0001  اَ  ⟵  معنی (اصل)  \r\n-----\r\n0002 بَ ⟵ دوسرے\r\n0001 جَ ⟵ الگ (نوٹ)\r\n';
    const expected=record(text,1,2),saved=replaceLughatRecord(text,1,expected,{word:'جِ',meaning:'درست (نوٹ)'});
    assert.equal(saved,text.replace('0001 جَ ⟵ الگ (نوٹ)','0001 جِ ⟵ درست (نوٹ)'));
    const first=replaceLughatRecord(text,1,record(text,1),{word:'اِ',meaning:'نیا (اصل)'});
    assert(first.startsWith('\uFEFFheading\r\n0001  اِ  ⟵  نیا (اصل)  \r\n'));
    assert.throws(()=>replaceLughatRecord(text,1,{...expected,rawMeaning:'stale'},{word:'جِ',meaning:'درست'}),/changed/);
    assert.throws(()=>replaceLughatRecord(text,1,expected,{word:'ج\nد',meaning:'درست'}),/one source line/);
    assert.throws(()=>replaceLughatRecord(text,1,expected,{word:'جِ',meaning:'(notes only)'}),/Missing Urdu meaning/);
});
test('verification only advances, preserving other lines and the final-newline convention',()=>{
    for(const newline of ['\n','\r\n','\r'])for(const ending of ['',newline]) {
        const text=['heading',row(1),row(2),'-----',row(3),'another heading',row(4)].join(newline)+ending;
        const moved=moveVerificationBoundary(text,3,record(text,3));
        assert(moved.changed);assert.equal(parseEditorBook(moved.text,'book_b').availableThrough,3);
        assert.deepEqual(nonMarkers(moved.text),nonMarkers(text));
        assert.equal(/(?:\r\n|\n|\r)$/.test(moved.text),!!ending);
        for(const number of [1,2,3]) {
            const same=moveVerificationBoundary(moved.text,number,record(moved.text,number));
            assert.equal(same.changed,false);assert.equal(same.text,moved.text);
        }
        const last=moveVerificationBoundary(moved.text,4,record(moved.text,4));
        assert.equal(parseEditorBook(last.text,'book_b').availableThrough,4);
        assert.deepEqual(nonMarkers(last.text),nonMarkers(text));
        assert.equal(/(?:\r\n|\n|\r)$/.test(last.text),!!ending);
    }
});
test('verification creates a missing marker and refuses stale targets or ambiguous marker layouts',()=>{
    const text=[row(1),row(2),row(3)].join('\n');
    assert.equal(parseEditorBook(text,'book_b').availableThrough,0);
    const created=moveVerificationBoundary(text,2,record(text,2));
    assert.equal(created.text,[row(1),row(2),'-----',row(3)].join('\n'));
    const bom='\uFEFF-----\r\n'+row(1)+'\r\n'+row(2);
    assert.equal(moveVerificationBoundary(bom,1,record(bom,1)).text,'\uFEFF'+row(1)+'\r\n-----\r\n'+row(2));
    assert.throws(()=>moveVerificationBoundary(text,2,{...record(text,2),word:'old'}),/changed/);
    assert.throws(()=>moveVerificationBoundary(text,99),/no longer/);
    const multiple=[row(1),'-----',row(2),'-----',row(3)].join('\n');
    assert.throws(()=>moveVerificationBoundary(multiple,3,record(multiple,3)),/more than one/);
});
test('real verification move preserves saved corrections and all other source content',()=>{
    const expected=record(source,25),corrected=replaceLughatRecord(source,25,expected,{word:expected.word,meaning:expected.rawMeaning+' (reviewed)'});
    const moved=moveVerificationBoundary(corrected,25,record(corrected,25));
    assert.equal(parseEditorBook(moved.text,'book_b').records.filter(r=>r.verified).length,25);
    assert.equal(record(moved.text,25).rawMeaning,record(corrected,25).rawMeaning);
    assert.deepEqual(nonMarkers(moved.text),nonMarkers(corrected));
    assert.equal((moved.text.split(/\r\n|\n|\r/).filter(line=>line==='-----')).length,1);
});
test('marker position controls publication even when source numbers repeat or go out of order',()=>{
    const text=[row(1),'-----',row(5),row(1,'second occurrence'),row(6)].join('\n');
    const moved=moveVerificationBoundary(text,1,record(text,1,2));
    assert(moved.changed,'a marker before the selected entry must move to its next line');
    assert.equal(moved.text,[row(1),row(5),row(1,'second occurrence'),'-----',row(6)].join('\n'));
    assert.equal(parseEditorBook(moved.text,'book_b').availableCount,3);
    const alreadyAhead=moveVerificationBoundary(moved.text,5,record(moved.text,5));
    assert.equal(alreadyAhead.changed,false);assert.equal(alreadyAhead.text,moved.text);
});
test('GitHub edits preserve source and forward-only publication reads the newest boundary before committing',async t=>{
    const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
    let text=[row(1),row(2),'-----',row(3),row(4)].join('\n'),revision=1;const calls=[];
    globalThis.fetch=async(url,options)=>{
        calls.push({url,options});
        assert.equal(options.headers.Authorization,'Bearer test-only-token');
        if(options.method!=='PUT')return {ok:true,json:async()=>({sha:'sha'+revision,content:Buffer.from(text).toString('base64')})};
        const body=JSON.parse(options.body);assert.equal(body.sha,'sha'+revision);assert.equal(body.branch,'main');
        text=Buffer.from(body.content,'base64').toString('utf8');revision++;return {ok:true};
    };
    const args={filename:'Lughat-AlQuran-word-meaning.txt',token:'test-only-token'};
    assert.equal(repositoryVocabularyPath(args.filename,'https://hassanme2050.github.io/Quran-Arabic-Quiz/Test/editor/js/github.js'),'Test/Lughat-AlQuran-word-meaning.txt');
    await saveVocabularyRecord({...args,number:3,expected:record(text,3),updated:{word:'corrected',meaning:'meaning (notes)'}});
    assert.equal(record(text,3).rawMeaning,'meaning (notes)');assert.equal(parseEditorBook(text,'book_b').availableThrough,2);
    const published=await saveVerificationBoundary({...args,number:3,expected:record(text,3)});
    assert(published.changed);assert.equal(parseEditorBook(text,'book_b').availableThrough,3);
    const puts=calls.filter(call=>call.options.method==='PUT').length;
    // Another editor advances the remote file; our older target must not create a commit.
    text=moveVerificationBoundary(text,4,record(text,4)).text;revision++;
    const same=await saveVerificationBoundary({...args,number:3,expected:record(text,3)});
    assert.equal(same.changed,false);assert.equal(same.availableThrough,4);
    assert.equal(calls.filter(call=>call.options.method==='PUT').length,puts);
    assert(calls.every(call=>String(call.url).includes('Lughat-AlQuran-word-meaning.txt')));
});
test('GitHub conflicts do not report a successful verification advance',async t=>{
    const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
    const text=[row(1),'-----',row(2)].join('\n');let writes=0;
    globalThis.fetch=async(url,options)=>options.method==='PUT'?(writes++,{ok:false,status:409}):
        {ok:true,json:async()=>({sha:'latest',content:Buffer.from(text).toString('base64')})};
    await assert.rejects(saveVerificationBoundary({filename:'Lughat-AlQuran-word-meaning.txt',token:'test-only-token',number:2,expected:record(text,2)}),/changed while saving/);
    assert.equal(writes,1);assert.equal(parseEditorBook(text,'book_b').availableThrough,1);
});
