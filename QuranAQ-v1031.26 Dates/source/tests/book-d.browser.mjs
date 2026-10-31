import {fixtureBook} from './library-fixture.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseQuranVocabulary} from '../shared/quran-vocabulary.js?v=1030.26-dates3';
const root=new URL('../',import.meta.url);
const server=spawn(process.execPath,[fileURLToPath(new URL('serve.cjs',root))],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
const api=/https:\/\/(api\.alquran\.cloud|alquran\.api\.islamic\.network)\/v1\/ayah\//;
const payload=(key,wrong=false)=>{const [surah,ayah]=key.split(':').map(Number);return {code:200,data:[
 {text:'نص عربي للاختبار '+key,surah:{number:surah,englishName:'Test chapter'},numberInSurah:wrong?ayah+1:ayah,edition:{identifier:'quran-uthmani'}},
 {text:'English translation for '+key,surah:{number:surah},numberInSurah:ayah,edition:{identifier:'en.sahih',englishName:'Saheeh International'}}
]};};
let browser,page;
try{
 const url=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server timeout')),10000);server.on('error',reject);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});});
 browser=await chromium.launch({headless:true});fs.mkdirSync('artifacts',{recursive:true});
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport});page=await context.newPage();const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
  let mode='normal',held,ready;
  const fulfill=(route,key,wrong=false)=>route.fulfill({status:200,headers:{'access-control-allow-origin':'*','content-type':'application/json'},body:JSON.stringify(payload(key,wrong))});
  await page.route(api,async route=>{
   const key=new URL(route.request().url()).pathname.split('/')[3];requests.push(key);
   if(mode==='hold'&&key==='55:45'){held=route;ready();return;}
   if(mode==='fail')return route.fulfill({status:503,headers:{'access-control-allow-origin':'*'},body:'Unavailable'});
   return fulfill(route,key,mode==='wrong');
  });
  await page.goto(url);await page.locator('#menu-view:not(.hidden)').waitFor();await page.selectOption('#vocabulary-book-selector','book_d');
  await page.locator('#status-message').filter({hasText:'9 words'}).waitFor();
  assert(await page.locator('[data-value="quiz"][data-action="triggerSelectedSession"]').isEnabled());assert(await page.locator('[data-action="openQuest"]').isEnabled());assert(await page.locator('[data-action="openDictionaryMode"]').isEnabled());assert(await page.locator('#quiz-code-entry').isVisible());
  await page.locator('[data-value="quiz"][data-action="triggerSelectedSession"]').click();
  for(let i=0;i<9;i++){
   const item=await page.evaluate(async()=>{const {state}=await import('/js/state.js?v=1030.26-dates3');return state.sessionWords[state.currentIndex];});
   const choices=await page.locator('#quiz-options-box button').allTextContents();assert(choices.includes(item.meaning));assert(choices.every(value=>!value.includes('Alternative Choice')));
   await page.locator('#quiz-options-box button').nth(choices.indexOf(item.meaning)).click();
   if(i<8)await page.locator('#quiz-counter').filter({hasText:'Question '+(i+2)+' of 9'}).waitFor();
  }
  await page.locator('#quiz-finished-view:not(.hidden)').waitFor();assert.equal(await page.locator('#score-text-value').textContent(),'9/9');await page.locator('#quiz-finished-view [data-action="exitToHome"]').click();
  await page.locator('[data-action="openDictionaryMode"]').click();assert.equal(await page.locator('.dictionary-entry').count(),9);await page.locator('#dictionary-view [data-action="exitToHome"]').click();
  await page.locator('[data-action="openQuest"]').click();await page.locator('#quest-continue').click();assert(await page.locator('#quest-review-view').isVisible());await page.locator('#quest-review-view [data-quest-action="map"]').click();await page.locator('#quest-map-view [data-quest-action="home"]').click();
  await page.locator('[data-value="flashcard"][data-action="triggerSelectedSession"]').click();
  async function findWord(word){
   for(let i=0;i<10;i++){
    if(await page.locator('#card-arabic-field').textContent()===word)return;
    if(await page.locator('#card-action-btn').textContent()==='Show Meaning')await page.locator('#card-action-btn').click();
    await page.locator('#card-action-btn').click();
   }
   throw Error('Sample word not reached');
  }
  await findWord('هَٰذَا');
  assert.equal(await page.locator('#card-context strong').textContent(),'Main Category');assert.equal(await page.locator('#card-context span').textContent(),'Sub Category');
  if(await page.locator('#card-action-btn').textContent()==='Show Meaning')await page.locator('#card-action-btn').click();
  assert.equal(await page.locator('#card-meaning-field').textContent(),'This, That, What');const counter=await page.locator('#card-counter').textContent();
  const title=await page.locator('#app-title').boundingBox();assert(title.height<55);
  assert.equal(await page.locator('#card-details-btn').evaluate(el=>el.parentElement.id),'review-card-frame');
  await page.locator('#card-details-btn').click();await page.locator('#verse-english:not(.hidden)').waitFor();
  assert.equal(await page.locator('#verse-reference').textContent(),'12:34');assert.equal(await page.locator('#verse-counter').textContent(),'Verse 1 of 4');assert(await page.locator('#verse-prev-btn').isDisabled());
  assert.equal(await page.locator('#verse-details-view').getAttribute('aria-modal'),'true');assert(await page.locator('#flashcard-view').isVisible());
  assert.equal(await page.locator('#verse-english').textContent(),'English translation for 12:34');assert.equal(await page.locator('#verse-arabic').getAttribute('dir'),'rtl');
  await page.locator('#verse-next-btn').click();await page.locator('#verse-english').filter({hasText:'34:32'}).waitFor();
  const count=requests.length;await page.locator('#verse-prev-btn').click();await page.locator('#verse-english').filter({hasText:'12:34'}).waitFor();assert.equal(requests.length,count);
  await page.locator('#verse-next-btn').click();await page.locator('#verse-english').filter({hasText:'34:32'}).waitFor();
  mode='fail';await page.locator('#verse-next-btn').click();await page.locator('#verse-retry-btn:not(.hidden)').waitFor();assert(await page.locator('#verse-arabic').isHidden());assert((await page.locator('#verse-error').textContent()).includes('43:44'));
  mode='normal';await page.locator('#verse-retry-btn').click();await page.locator('#verse-english').filter({hasText:'43:44'}).waitFor();assert((await page.locator('#verse-word-meaning').textContent()).includes('That'));
  await page.locator('#verse-next-btn').click();await page.locator('#verse-english').filter({hasText:'55:10'}).waitFor();assert(await page.locator('#verse-next-btn').isDisabled());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'artifacts/book-d-details-'+viewport.width+'.png',fullPage:true});
  await page.locator('#verse-back-btn').click();assert.equal(await page.locator('#card-counter').textContent(),counter);assert(await page.locator('#card-meaning-field').isVisible());assert.equal(await page.locator('#card-arabic-field').textContent(),'هَٰذَا');
  await page.screenshot({path:'artifacts/book-d-card-'+viewport.width+'.png',fullPage:true});
  await page.locator('#flashcard-view [data-action="exitToHome"]').click();await page.locator('[data-value="flashcard"][data-action="triggerSelectedSession"]').click();
  await findWord('ذَٰلِكَ');mode='hold';let waiting=new Promise(resolve=>{ready=resolve;});await page.locator('#card-details-btn').click();await waiting;
  await page.locator('#verse-next-btn').click();await page.locator('#verse-english').filter({hasText:'22:11'}).waitFor();await fulfill(held,'55:45').catch(()=>{});assert.equal(await page.locator('#verse-reference').textContent(),'22:11');assert((await page.locator('#verse-english').textContent()).includes('22:11'));
  await page.locator('#verse-back-btn').click();waiting=new Promise(resolve=>{ready=resolve;});await page.locator('#card-details-btn').click();await waiting;await page.locator('#verse-back-btn').click();await fulfill(held,'55:45').catch(()=>{});assert(await page.locator('#flashcard-view').isVisible());
  mode='normal';await page.locator('#flashcard-view [data-action="exitToHome"]').click();await page.selectOption('#vocabulary-book-selector','book_a');await page.locator('#status-message').filter({hasText:'Loaded'}).waitFor();
  assert(await page.locator('[data-value="quiz"][data-action="triggerSelectedSession"]').isEnabled());assert(await page.locator('[data-action="openDictionaryMode"]').isEnabled());
  await page.locator('[data-value="flashcard"][data-action="triggerSelectedSession"]').click();assert(await page.locator('#card-details-btn').isHidden());assert.deepEqual(errors,[]);await context.close();
 }
 // Exercise the extra editable field through the real Editor UI with mocked GitHub writes.
 const editorContext=await browser.newContext({viewport:{width:390,height:844}});page=await editorContext.newPage();
 let bank=fixtureBook("Quran-Vocabulary-Meaning-Arabic-English.txt"),writes=0;
 const first=parseQuranVocabulary(bank).records[0];
 await page.route('**/CP.txt',route=>route.fulfill({status:200,body:Buffer.from('test-only').toString('base64')}));
 await page.route('https://api.github.com/**',route=>{
  assert(new URL(route.request().url()).pathname.endsWith('/Quran-Vocabulary-Meaning-Arabic-English.txt'));
  if(route.request().method()==='PUT'){const body=route.request().postDataJSON();assert.equal(body.sha,'rev'+writes);bank=Buffer.from(body.content,'base64').toString('utf8');writes++;return route.fulfill({status:200,body:'{}'});}
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({sha:'rev'+writes,content:Buffer.from(bank).toString('base64')})});
 });
 await page.goto(url+'/editor/?book=book_d');await page.locator('#admin-passcode-box').fill('test-only');await page.locator('#admin-token-box').fill('test-only-token');await page.locator('#verify-open-btn').click();await page.locator('#login-shield-gate').waitFor({state:'hidden'});
 assert.equal(await page.locator('#edit-references-field').inputValue(),first.rawReferences);
 await page.locator('#edit-references-field').fill('Broken reference');await page.locator('#commit-save-btn').click();await page.locator('#toast-alert').filter({hasText:'reference'}).waitFor();assert.equal(writes,0);
 await page.locator('#edit-references-field').fill('Reviewed 2:255, Another 10: 10');await page.locator('#commit-save-btn').click();await page.locator('#toast-alert').filter({hasText:'saved to GitHub'}).waitFor();assert.equal(writes,1);
 const saved=parseQuranVocabulary(bank).records;assert.equal(saved[0].references[0].key,'2:255');assert.equal(saved[0].references[1].key,'10:10');assert.equal(saved.length,9);
 await page.screenshot({path:'artifacts/book-d-editor-390.png',fullPage:true});await editorContext.close();
 // Check real cross-origin Arabic + English retrieval separately from the deterministic UI fixtures.
 const live=await browser.newContext({viewport:{width:390,height:844}});page=await live.newPage();await page.goto(url);await page.locator('#menu-view:not(.hidden)').waitFor();
 await page.selectOption('#vocabulary-book-selector','book_d');await page.locator('#status-message').filter({hasText:'9 words'}).waitFor();await page.locator('[data-value="flashcard"][data-action="triggerSelectedSession"]').click();
 await page.locator('#card-details-btn').click();await page.locator('#verse-arabic:not(.hidden)').waitFor({timeout:25000});assert(/[\u0600-\u06ff]/.test(await page.locator('#verse-arabic').textContent()));assert(/[A-Za-z]/.test(await page.locator('#verse-english').textContent()));
 await page.screenshot({path:'artifacts/book-d-live-390.png',fullPage:true});await live.close();page=null;
 console.log('PASS: Book D Review-only gating, category layout, 4 references in order, Arabic/English display, cached back/forward, retry, stale-response/back cancellation, same-word/reveal restoration, old-book behavior and real live cross-origin verse service on desktop/mobile.');
}catch(error){if(page)await page.screenshot({path:'artifacts/book-d-failure.png',fullPage:true}).catch(()=>{});throw error;}
finally{if(browser)await browser.close();server.kill();}
