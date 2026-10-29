import { emptyQuestProgress, reconcileQuestProgress } from './quest-model.js';
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
