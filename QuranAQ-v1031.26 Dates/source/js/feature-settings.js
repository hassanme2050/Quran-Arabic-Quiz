import {defaultSettings,validateSettings} from '../shared/dashboard-settings.js';
import {LIBRARY,libraryPath,libraryUrl} from '../shared/library-config.js';
let settings=defaultSettings(),override=false,taps=0;
const listeners=[],CACHE='quranaq.dates.dashboard.v1';
export function currentSettings(){return validateSettings(settings);}
export function featureState(book,key='state'){const row=settings.books[book];if(!row)return 'disable';if(override)return 'enable';if(row.state!=='enable')return row.state;return row[key]||'disable';}
export function canUse(book,key='state'){return featureState(book,key)==='enable';}
export function onSettingsChange(fn){listeners.push(fn);}
export function applySettings(value){settings=validateSettings(value);try{localStorage.setItem(CACHE,JSON.stringify(settings));}catch{}listeners.forEach(fn=>fn());}
export function recordGoTap(){if(override)return false;if(++taps<7)return false;override=true;listeners.forEach(fn=>fn());return true;}
let pending=null;
export async function initializeSettings(){if(pending)return pending;pending=readSettings();try{await pending;}finally{pending=null;}}
async function readSettings(){try{const url='https://api.github.com/repos/'+LIBRARY.owner+'/'+LIBRARY.repository+'/contents/'+libraryPath('dbs.json')+'?ref='+LIBRARY.branch+'&_='+Date.now();let value;
try{const response=await fetch(url,{cache:'no-store',headers:{Accept:'application/vnd.github+json'}});if(!response.ok)throw Error('Settings unavailable');const file=await response.json();value=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0))));}
catch{const raw=libraryUrl('dbs.json');raw.searchParams.set('_',Date.now());const response=await fetch(raw,{cache:'no-store'});if(!response.ok)throw Error('Settings unavailable');value=JSON.parse(await response.text());}
const clean=validateSettings(value);if(JSON.stringify(clean)!==JSON.stringify(settings))applySettings(clean);else{try{localStorage.setItem(CACHE,JSON.stringify(clean));}catch{}}}catch{try{settings=validateSettings(JSON.parse(localStorage.getItem(CACHE)));}catch{settings=defaultSettings();for(const row of Object.values(settings.books))row.state='disable';}listeners.forEach(fn=>fn());}}

const selectorOptions=new WeakMap();
export function syncBookSelector(selector,key='state'){
 if(!selectorOptions.has(selector))selectorOptions.set(selector,Array.from(selector.getElementsByTagName('option')).map(option=>({value:option.value,label:option.textContent})));
 const previous=selector.value;
 const options=selectorOptions.get(selector).filter(option=>featureState(option.value,key)!=='hide').map(item=>{const option=document.createElement('option');option.value=item.value;option.textContent=item.label;option.disabled=!canUse(item.value,key);return option;});
 selector.replaceChildren(...options);selector.value=options.some(option=>option.value===previous&&!option.disabled)?previous:options.find(option=>!option.disabled)?.value||'';
}
