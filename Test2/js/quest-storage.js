import { emptyQuestProgress, reconcileQuestProgress } from './quest-model.js?v=1030.26-strawberry2';
// Saved per book and app URL so preview progress cannot overwrite live progress.
export const QUEST_STORAGE_KEY='quranaq.quest.v1:book_a:'+new URL('../',import.meta.url).pathname;
export function createQuestStorage(storage,key=QUEST_STORAGE_KEY) {
    let issue='';
    return {
        get issue(){return issue;},
        load(wordCount){
            try {const raw=storage.getItem(key);issue='';return raw?reconcileQuestProgress(JSON.parse(raw),wordCount):emptyQuestProgress();}
            catch {issue='Saved progress could not be read. You can still play; export progress as a backup.';return emptyQuestProgress();}
        },
        save(progress){
            progress.savedAt=new Date().toISOString();
            try {storage.setItem(key,JSON.stringify(progress));issue='';return true;}
            catch {issue='Progress cannot be saved in this browser. Keep this tab open and export a backup before leaving.';return false;}
        }
    };
}
export function parseQuestImport(text,wordCount) {
    if(text.length>1000000)throw new Error('This progress file is too large.');
    let data;try{data=JSON.parse(text);}catch{throw new Error('Choose a valid Quest progress JSON file.');}
    if(data?.schema!==1||data?.book!=='book_a')throw new Error('This file is not compatible with this vocabulary book.');
    return reconcileQuestProgress(data,wordCount);
}

export const QUEST_BOOKS=['book_a','book_b','book_c'];
export const QUEST_LIBRARY_STORAGE_KEY='quranaq.quest.v2:books:'+new URL('../',import.meta.url).pathname;
export function createQuestBackup(books) {
    return {schema:2,type:'quranaq-quest',savedAt:new Date().toISOString(),books:Object.fromEntries(
        QUEST_BOOKS.map(book=>[book,books[book]||emptyQuestProgress(book)]))};
}
function readBackupBooks(data) {
    // Old single-book backups remain valid without resetting the other book.
    if(data?.schema===1 && QUEST_BOOKS.includes(data.book))return {[data.book]:data};
    if(data?.schema!==2||data.type!=='quranaq-quest'||!data.books||typeof data.books!=='object'||Array.isArray(data.books))
        throw new Error('This file is not a compatible Quest progress backup.');
    const entries=Object.entries(data.books);
    if(!entries.length||entries.some(([book,progress])=>!QUEST_BOOKS.includes(book)||progress?.schema!==1||progress.book!==book))
        throw new Error('This backup contains unsupported or mismatched vocabulary books.');
    return data.books;
}
export function parseQuestBackup(text,wordCounts) {
    if(text.length>5000000)throw new Error('This progress file is too large.');
    let data;try{data=JSON.parse(text);}catch{throw new Error('Choose a valid Quest progress JSON file.');}
    return Object.fromEntries(Object.entries(readBackupBooks(data)).map(([book,progress])=>{
        const count=wordCounts[book];
        if(!Number.isSafeInteger(count)||count<0)throw new Error('Could not verify the vocabulary for '+book+'. Please try again.');
        return [book,reconcileQuestProgress(progress,count,book)];
    }));
}
export function createQuestLibraryStorage(storage,key=QUEST_LIBRARY_STORAGE_KEY,legacyKey=QUEST_STORAGE_KEY) {
    let issue='',books=Object.fromEntries(QUEST_BOOKS.map(book=>[book,emptyQuestProgress(book)]));
    try {
        const raw=storage.getItem(key);
        if(raw)Object.assign(books,readBackupBooks(JSON.parse(raw)));
        else {
            const legacy=storage.getItem(legacyKey);
            if(legacy)Object.assign(books,readBackupBooks(JSON.parse(legacy)));
        }
    } catch {issue='Saved progress could not be read. You can still play; export progress as a backup.';}
    function persist() {
        try {storage.setItem(key,JSON.stringify(createQuestBackup(books)));issue='';return true;}
        catch {issue='Progress cannot be saved in this browser. Keep this tab open and export a backup before leaving.';return false;}
    }
    return {
        get issue(){return issue;},
        loadBook(book,wordCount){
            if(!QUEST_BOOKS.includes(book))throw new Error('Unknown Quest book.');
            return books[book]=reconcileQuestProgress(books[book],wordCount,book);
        },
        save(progress){
            if(!QUEST_BOOKS.includes(progress.book))throw new Error('Unknown Quest book.');
            progress.savedAt=new Date().toISOString();books[progress.book]=progress;
            return persist();
        },
        backup(){return createQuestBackup(books);},
        importBooks(imported){
            // One storage write restores the selected backup books together.
            Object.assign(books,imported);return persist();
        }
    };
}
