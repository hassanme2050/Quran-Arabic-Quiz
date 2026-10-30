import {parseVocabularyRecords} from '../../shared/vocabulary.js?v=1029.26-strawberry7';
import {parseLughatBook} from '../../shared/lughat.js?v=1029.26-strawberry7';
import {parseTajweedBook,validateTajweedQuestion} from '../../shared/tajweed.js?v=1029.26-strawberry7';

export const recordNumber=(record,index)=>record.number??index+1;
export const editableMeaning=record=>record.rawMeaning??record.meaning;
export function parseEditorBook(text,book) {
    if(book==='book_a')return {records:parseVocabularyRecords(text),availableThrough:0,availableCount:0};
    if(book==='book_c'){const {records}=parseTajweedBook(text),available=records.filter(record=>record.verified);return {records,availableThrough:available.at(-1)?.number||0,availableCount:available.length};}
    if(book!=='book_b')throw new Error('This book is not available in the Editor.');
    const parsed=parseLughatBook(text),occurrences=new Map();
    const records=parsed.records.map(record=>{
        const occurrence=(occurrences.get(record.number)||0)+1;occurrences.set(record.number,occurrence);
        return {...record,occurrence};
    });
    const available=records.filter(record=>record.verified);
    return {records,availableThrough:available.at(-1)?.number||0,availableCount:available.length};
}
export function matchingRecordIndex(records,number,occurrence=1) {
    return records.findIndex((record,index)=>recordNumber(record,index)===number&&(record.occurrence??1)===occurrence);
}
export function validateEditorUpdate(updated,book) {
    if(book==='book_c'){validateTajweedQuestion(updated);return;}
    if(!updated.word.trim()||!updated.meaning.trim()||/[\r\n]/.test(updated.word+updated.meaning)||
        (book==='book_b'?updated.word.includes('\u27F5'):updated.word.includes('=')))
        throw new Error('Enter a word and meaning on one source line.');
}

export function replaceTajweedRecord(text,number,expected,updated) {
    validateEditorUpdate(updated,'book_c');
    const record=parseTajweedBook(text).records.find(item=>item.number===number);
    if(!record||record.word!==expected.word||record.meaning!==expected.meaning||JSON.stringify(record.wrongAnswers)!==JSON.stringify(expected.wrongAnswers))
        throw new Error('This Tajweed question changed on GitHub. Reload the Editor before saving.');
    const parts=text.split(/(\r\n|\n|\r)/),position=(record.sourceLine-1)*2;
    const line=parts[position].match(/^(\uFEFF?\s*\d+\)\s*)(.*?)(\s*⟶\s*)(.*?)(\s*⟹\s*)(.*?)(\s*)$/);
    if(!line)throw new Error('The source question format changed. Reload the Editor.');
    const wrong=line[6].split(/(\s+-\s+)/).map((value,index)=>index%2?value:updated.wrongAnswers[index/2].trim()).join('');
    parts[position]=line[1]+updated.word.trim()+line[3]+updated.meaning.trim()+line[5]+wrong+line[7];
    const content=parts.join('');parseTajweedBook(content);return content;
}

export function replaceLughatRecord(text,number,expected,updated) {
    validateEditorUpdate(updated,'book_b');
    const records=parseEditorBook(text,'book_b').records;
    const index=matchingRecordIndex(records,number,expected.occurrence??1),record=records[index];
    if(!record||record.word!==expected.word||record.rawMeaning!==editableMeaning(expected))
        throw new Error('This book entry changed on GitHub. Reload the Editor before saving.');
    const parts=text.split(/(\r\n|\n|\r)/),position=(record.sourceLine-1)*2;
    const line=parts[position].match(/^(\uFEFF?\s*\d{4}\s+)(.+?)(\s*\u27F5\s*)(.+?)(\s*)$/);
    if(!line)throw new Error('The source entry format changed. Reload the Editor.');
    parts[position]=line[1]+updated.word.trim()+line[3]+updated.meaning.trim()+line[5];
    const content=parts.join('');
    parseEditorBook(content,'book_b');
    return content;
}

export function moveVerificationBoundary(text,number,expected,book='book_b') {
    if(!Number.isInteger(number)||number<1)throw new Error('Load a valid word number first.');
    if(!['book_b','book_c'].includes(book))throw new Error('Student availability is managed for Book B and Book C.');
    const parsed=parseEditorBook(text,book);
    const index=matchingRecordIndex(parsed.records,number,expected?.occurrence??1),record=parsed.records[index];
    if(!record)throw new Error('The selected entry is no longer in the source. Reload the Editor.');
    const bom=text.startsWith('\uFEFF')?'\uFEFF':'';
    const parts=text.slice(bom.length).split(/(\r\n|\n|\r)/),lines=[];
    for(let i=0;i<parts.length;i+=2)lines.push({text:parts[i],eol:parts[i+1]||''});
    const markers=lines.flatMap((line,index)=>/^\s*-{5,}(?:\s.*)?$/.test(line.text)?[index]:[]);
    if(markers.length>1)throw new Error('The file contains more than one verification marker. Please resolve the extra markers first.');
    const old=markers[0]??-1,target=record.sourceLine-1;
    if(old>=target)return {text,changed:false,availableThrough:parsed.availableThrough};
    if(expected&&(record.word!==expected.word||editableMeaning(record)!==editableMeaning(expected)||
        (book==='book_c'&&JSON.stringify(record.wrongAnswers)!==JSON.stringify(expected.wrongAnswers))))
        throw new Error('This entry changed on GitHub. Reload and review it before making it available.');
    const marker=old<0?{text:'-----',eol:''}:lines.splice(old,1)[0];
    const insertAt=target+1-(old>=0&&old<target?1:0),previous=lines[insertAt-1];
    const newline=previous.eol||text.match(/\r\n|\n|\r/)?.[0]||'\n';
    if(!previous.eol)previous.eol=newline;
    marker.eol=insertAt<lines.length?(marker.eol||newline):(/(?:\r\n|\n|\r)$/.test(text)?newline:'');
    lines.splice(insertAt,0,marker);
    const content=bom+lines.map(line=>line.text+line.eol).join('');
    return {text:content,changed:true,availableThrough:parseEditorBook(content,book).availableThrough};
}
