// Dates is portable; this is the library's location, not the app's location.
export const LIBRARY=Object.freeze({owner:'hassanme2050',repository:'Quran-Arabic-Quiz',branch:'main',folder:''});
export const BOOK_FILES=Object.freeze({book_a:'Vocabulary-File.txt',book_b:'Lughat-AlQuran-word-meaning.txt',book_c:'Tajweed-Question-Bank.txt',book_d:'Quran-Vocabulary-Meaning-Arabic-English.txt'});
export function libraryPath(filename){
    if(!Object.values(BOOK_FILES).includes(filename)&&filename!=='CP.txt'&&filename!=='dbs.json')throw new Error('Unknown library file.');
    return (LIBRARY.folder?LIBRARY.folder+'/':'')+filename;
}
export function libraryUrl(filename){
    return new URL('https://raw.githubusercontent.com/'+LIBRARY.owner+'/'+LIBRARY.repository+'/'+encodeURIComponent(LIBRARY.branch)+'/'+libraryPath(filename).split('/').map(encodeURIComponent).join('/'));
}
