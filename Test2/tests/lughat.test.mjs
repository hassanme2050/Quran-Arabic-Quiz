import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseLughatBook} from '../shared/lughat.js?v=1030.26-strawberry7';
import {encodeQuizCode, decodeTeacherQuizCode} from '../shared/quiz-codes.js?v=1030.26-strawberry7';
const source=fs.readFileSync(new URL('../Lughat-AlQuran-word-meaning.txt',import.meta.url),'utf8');
const headings=source.split(/\r?\n/).slice(0,2).join('\n');
const row=(n,meaning='meaning')=>String(n).padStart(4,'0')+' word'+n+' \u27F5 '+meaning;
test('real source preserves all entries, duplicate numbers, metadata, Urdu and explanations',()=>{
 const parsed=parseLughatBook(source);
 assert.equal(parsed.records.length,1858);
 assert.equal(parsed.records[0].number,1); assert.equal(parsed.records.at(-1).number,1844);
 assert.equal(parsed.records[0].juzz.number,1); assert.equal(parsed.records[0].surah.number,1);
 assert.equal(parsed.records.at(-1).juzz.number,3); assert.equal(parsed.records.at(-1).surah.number,3);
 for(const record of parsed.records)assert(record.explanation?record.rawMeaning.endsWith(record.explanation):record.rawMeaning===record.meaning);
 assert.equal(parsed.records.filter(item=>item.number===952).length,2);
 assert.equal(parsed.warnings.filter(w=>w.startsWith('Duplicate')).length,14);
 assert.equal(parsed.warnings.filter(w=>w.startsWith('Unrecognized')).length,0);
 const boundary=source.replace(/^\uFEFF/,'').split(/\r\n|\n|\r/).findIndex(line=>/^\s*-{5,}(?:\s.*)?$/.test(line));
 for(const record of parsed.records)assert.equal(record.verified,boundary>=0&&record.sourceLine-1<boundary);
});
test('first boundary controls verification, including subsequent headings and repeated boundaries',()=>{
 const parsed=parseLughatBook('\uFEFF'+headings+'\r\n'+row(1,'meaning (root)')+'\r\n  ----- All words above this line are verified.\r\n'+row(2)+'\r\n'+headings+'\r\n-----\r\n'+row(3));
 assert.deepEqual(parsed.records.map(r=>r.verified),[true,false,false]);
 assert.equal(parsed.records[0].explanation,'(root)'); assert.equal(parsed.records[0].meaning,'meaning');
 assert(parsed.warnings.some(w=>w.startsWith('Multiple')));
 assert.equal(parseLughatBook(row(1)).records[0].verified,false);
 assert(parseLughatBook('malformed').warnings.some(w=>w.startsWith('Unrecognized')));
});
test('Book B codes support source numbers above 999 and cannot be confused with legacy codes',()=>{
 const numbers=Array.from({length:20},(_,i)=>1800+i);
 const code=encodeQuizCode(numbers,'book_b'); assert(code.startsWith('B2:')); assert.deepEqual(decodeTeacherQuizCode(code),numbers);
 assert.deepEqual(decodeTeacherQuizCode(encodeQuizCode(numbers.slice(0,10),'book_b')),numbers.slice(0,10));
 for(const value of ['B2:0000','B2:0001','B2:'+Array(10).fill('0001').join('.'),'B2:'+Array(10).fill('abcd').join('.')]) assert.equal(decodeTeacherQuizCode(value),null);
 assert.throws(()=>encodeQuizCode(Array(10).fill(1),'book_b'));
});
