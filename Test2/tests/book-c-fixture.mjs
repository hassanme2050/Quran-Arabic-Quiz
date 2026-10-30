import {parseTajweedBook} from '../shared/tajweed.js?v=1030.26-strawberry3';
export function withTajweedVerificationAt(text,number){
    const lines=String(text).split(/\r\n|\n|\r/).filter(line=>!/^\s*-{5,}(?:\s.*)?$/.test(line));
    const record=parseTajweedBook(lines.join('\n')).records.find(item=>item.number===number);
    if(!record)throw new Error('Missing Tajweed fixture question '+number);
    lines.splice(record.sourceLine,0,'-----');return lines.join('\n');
}
