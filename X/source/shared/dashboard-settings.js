export const BOOK_IDS=['book_a','book_b','book_c','book_d'];
export const FEATURE_KEYS=['state','review','quiz','quest','dictionary','quizCode'];
export const SETTING_STATES=['enable','disable','hide'];
export function defaultSettings(){return {schema:1,books:Object.fromEntries(BOOK_IDS.map(id=>[id,{state:'enable',review:'enable',quiz:'enable',quest:'enable',dictionary:id==='book_c'?'disable':'enable',quizCode:id==='book_c'?'hide':'enable'}]))};}
export function validateSettings(value){if(!value||value.schema!==1||!value.books)throw Error('Invalid dashboard settings.');const clean={schema:1,books:{}};for(const id of BOOK_IDS){clean.books[id]={};for(const key of FEATURE_KEYS){const state=value.books[id]?.[key];if(!SETTING_STATES.includes(state))throw Error('Invalid setting: '+id+' / '+key);clean.books[id][key]=state;}}return clean;}
export function nextSetting(value){return SETTING_STATES[(SETTING_STATES.indexOf(value)+1)%3];}
