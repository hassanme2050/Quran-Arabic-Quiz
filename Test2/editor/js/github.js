import { parseVocabularyRecords, BOOK_FILES } from '../../shared/vocabulary.js?v=1030.26-strawberry3';
import {replaceLughatRecord,replaceTajweedRecord,replaceQuranVocabularyRecord,moveVerificationBoundary} from './book.js?v=1030.26-editor3';
const OWNER = 'hassanme2050';
const REPOSITORY = 'Quran-Arabic-Quiz';
const BRANCH = 'main';
// Match the loaded app's folder on GitHub Pages, including TEST deployments.
export function repositoryVocabularyPath(filename, moduleUrl = import.meta.url) {
    if (!Object.values(BOOK_FILES).includes(filename)) throw new Error('Unknown vocabulary file.');
    const appRoot = new URL('../../', moduleUrl);
    if (appRoot.hostname === OWNER + '.github.io') {
        const repositoryRoot = '/' + REPOSITORY + '/';
        if (!appRoot.pathname.startsWith(repositoryRoot)) throw new Error('Unexpected repository URL.');
        return decodeURIComponent(appRoot.pathname.slice(repositoryRoot.length)) + filename;
    }
    // Local previews retain the configured repository-root destination.
    return filename;
}
// Pure row replacement: preserve original book order, unrelated text and line endings.
export function replaceVocabularyRecord(text, number, expected, updated) {
    if (!Number.isInteger(number) || number < 1) throw new Error('Invalid book number.');
    const rows = parseVocabularyRecords(text);
    const current = rows[number - 1];
    if (!current || current.word !== expected.word || current.meaning !== expected.meaning) {
        throw new Error('This book record changed on GitHub. Reload the editor before saving.');
    }
    if (!updated.word.trim() || !updated.meaning.trim() || /[\r\n=]/.test(updated.word) || /[\r\n]/.test(updated.meaning)) {
        throw new Error('Use one word = meaning record per line.');
    }
    const parts = text.split(/(\r\n|\n|\r)/);
    let count = 0;
    for (let index = 0; index < parts.length; index += 2) {
        if (parseVocabularyRecords(parts[index]).length && ++count === number) {
            parts[index] = updated.word.trim() + ' = ' + updated.meaning.trim();
            return parts.join('');
        }
    }
    throw new Error('Book number was not found.');
}
async function updateVocabularyFile({filename,token,message,transform}) {
    if (!Object.values(BOOK_FILES).includes(filename)) throw new Error('Unknown vocabulary file.');
    const destination = repositoryVocabularyPath(filename).split('/').map(encodeURIComponent).join('/');
    const apiUrl = 'https://api.github.com/repos/' + OWNER + '/' + REPOSITORY + '/contents/' + destination;
    const headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    const response = await fetch(apiUrl + '?ref=' + BRANCH, { headers, cache: 'no-store' });
    if (!response.ok) throw new Error('GitHub read failed (' + response.status + ').');
    const file = await response.json();
    const bytes = Uint8Array.from(atob(file.content.replace(/\s/g,'')), char => char.charCodeAt(0));
    const text = new TextDecoder('utf-8',{ignoreBOM:true}).decode(bytes);
    const result = transform(text);
    const content = result.text;
    if(!result.changed)return result;
    const encoded = btoa(Array.from(new TextEncoder().encode(content), byte => String.fromCharCode(byte)).join(''));
    const saved = await fetch(apiUrl, {
        method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, content: encoded, sha: file.sha, branch: BRANCH })
    });
    if (!saved.ok) throw new Error(saved.status === 409 ? 'Vocabulary changed while saving. Reload and retry.' : 'GitHub save failed (' + saved.status + ').');
    return result;
}
export function saveVocabularyRecord({filename,token,number,expected,updated}) {
    return updateVocabularyFile({filename,token,message:'Update vocabulary word #'+number,transform:text=>({
        text:filename===BOOK_FILES.book_d?replaceQuranVocabularyRecord(text,number,expected,updated):filename===BOOK_FILES.book_b?replaceLughatRecord(text,number,expected,updated):filename===BOOK_FILES.book_c?replaceTajweedRecord(text,number,expected,updated):replaceVocabularyRecord(text,number,expected,updated),changed:true
    })});
}
export function saveVerificationBoundary({filename,token,number,expected}) {
    const book=filename===BOOK_FILES.book_b?'book_b':filename===BOOK_FILES.book_c?'book_c':null;
    if(!book)throw new Error('Student availability is managed for Book B and Book C.');
    return updateVocabularyFile({filename,token,message:'Make '+(book==='book_c'?'Book C questions':'Book B words')+' available through #'+number,
        transform:text=>moveVerificationBoundary(text,number,expected,book)});
}
