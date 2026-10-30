import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseTajweedBook} from '../shared/tajweed.js?v=1029.26-strawberry5';
import {replaceTajweedRecord} from '../editor/js/book.js?v=1029.26-editor7';
const root=new URL('../',import.meta.url),source=fs.readFileSync(new URL('Tajweed-Question-Bank.txt',root),'utf8'),records=parseTajweedBook(source).records;
const password='test-only-tajweed',cp=Buffer.from(password).toString('base64');
const server=spawn(process.execPath,[fileURLToPath(new URL('serve.cjs',root))],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
let browser,page;
try{
 const url=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server timeout')),10000);server.on('error',reject);server.stdout.on('data',b=>{const m=String(b).match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});});
 browser=await chromium.launch({headless:true});fs.mkdirSync('artifacts',{recursive:true});
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport,acceptDownloads:true});page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-29T12:00:00Z')});await page.goto(url);await page.locator('#menu-view:not(.hidden)').waitFor();await page.clock.pauseAt(new Date('2026-10-29T13:00:00Z'));
  async function selectC(){await page.selectOption('#vocabulary-book-selector','book_c');await page.locator('#status-message').filter({hasText:'680 Tajweed questions'}).waitFor();}
  await selectC();assert(await page.locator('#quiz-code-entry').isHidden());assert(await page.locator('#quiz-code-btn').isDisabled());
  await page.locator('[data-action="triggerSelectedSession"][data-value="quiz"]').click();
  for(let i=0;i<10;i++){
   const item=await page.evaluate(async()=>{const {state}=await import('/js/state.js?v=1029.26-strawberry5');return state.sessionWords[state.currentIndex];});
   assert.equal(await page.locator('#quiz-arabic-field').textContent(),item.word);assert((await page.locator('#quiz-question-context').textContent()).includes(item.subcategory.name));
   const options=await page.locator('#quiz-options-box button').allTextContents();assert.equal(options.length,4);assert.equal(new Set(options).size,4);
   assert.equal(options.filter(a=>a===item.meaning).length,1);options.filter(a=>a!==item.meaning).forEach(a=>assert(item.wrongAnswers.includes(a)));
   if(i===0)await page.screenshot({path:'artifacts/tajweed-quiz-'+viewport.width+'.png',fullPage:true});
   await page.locator('#quiz-options-box button').nth(options.indexOf(item.meaning)).click();await page.clock.fastForward(1200);
  }
  await page.locator('#quiz-finished-view:not(.hidden)').waitFor();assert.equal(await page.locator('#score-text-value').textContent(),'10/10');
  assert((await page.locator('#summary-table-container th').allTextContents()).includes('Correct Answer'));
  await page.locator('#quiz-finished-view [data-action="exitToHome"]').click();
  await page.locator('[data-action="updateSegmentSelection"][data-value="last"]').click();
  await page.locator('[data-action="triggerSelectedSession"][data-value="flashcard"]').click();
  const review=await page.evaluate(async()=>{const {state}=await import('/js/state.js?v=1029.26-strawberry5');return state.sessionWords[0];});assert(review.number>670);
  assert.equal(await page.locator('#card-action-btn').textContent(),'Show Answer');await page.locator('#card-action-btn').click();assert.equal(await page.locator('#card-meaning-field').textContent(),review.meaning);
  await page.locator('#flashcard-view [data-action="exitToHome"]').click();await page.locator('[data-action="openDictionaryMode"]').click();
  assert.equal(await page.locator('#dictionary-count').textContent(),'680 questions');assert.equal(await page.locator('#dict-sort-arabic').textContent(),'Question');
  await page.locator('#dictionary-search-toggle').click();await page.locator('#dictionary-search').fill('التحسين');assert(await page.locator('.dictionary-entry').count()>0);
  assert.equal(await page.locator('.dictionary-word').first().getAttribute('dir'),'auto');
  await page.locator('#dictionary-view [data-action="exitToHome"]').click();await page.locator('[data-action="openQuest"]').click();
  assert.equal(await page.locator('.quest-node').count(),81);await page.locator('#quest-continue').click();
  assert.equal(await page.locator('#quest-review-number').textContent(),'Book question #1');
  for(let i=0;i<3;i++)await page.locator('#quest-review-next').click();
  await page.reload();await page.locator('#menu-view:not(.hidden)').waitFor();await selectC();await page.locator('[data-action="openQuest"]').click();await page.locator('#quest-continue').click();
  assert.equal(await page.locator('#quest-review-number').textContent(),'Book question #4');
  for(let i=3;i<10;i++)await page.locator('#quest-review-next').click();await page.locator('#quest-quiz-view:not(.hidden)').waitFor();
  const questText=await page.locator('#quest-question-word').textContent(),question=records.find(r=>r.word===questText);
  const choices=await page.locator('#quest-answer-options button').allTextContents();assert.equal(choices.length,4);choices.filter(a=>a!==question.meaning).forEach(a=>assert(question.wrongAnswers.includes(a)));
  await page.locator('#quest-answer-options button').nth(choices.indexOf(question.meaning)).click();await page.clock.fastForward(1200);
  await page.locator('#quest-quiz-view [data-quest-action="map"]').click();
  const downloadEvent=page.waitForEvent('download');await page.locator('#quest-export').click();const download=await downloadEvent;
  const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
  const backup=Buffer.concat(chunks),exported=JSON.parse(backup.toString());assert.deepEqual(Object.keys(exported.books),['book_a','book_b','book_c']);assert.equal(exported.books.book_c.runs['stage-1'].answers.length,1);
  await page.evaluate(()=>localStorage.clear());await page.reload();await page.locator('#menu-view:not(.hidden)').waitFor();await selectC();await page.locator('[data-action="openQuest"]').click();
  page.once('dialog',dialog=>dialog.accept());await page.locator('#quest-import-file').setInputFiles({name:'all-books.json',mimeType:'application/json',buffer:backup});
  await page.locator('#quest-continue').filter({hasText:'Continue Stage 1'}).waitFor();await page.locator('#quest-continue').click();assert.equal(await page.locator('#quest-question-counter').textContent(),'Question 2 of 10');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await page.clock.resume();

  page=await context.newPage();const editorErrors=[];page.on('pageerror',error=>editorErrors.push(error.message));let remote=source,revision=1,puts=0;
  await page.route('**/CP.txt',route=>route.fulfill({status:200,contentType:'text/plain; charset=utf-8',body:cp}));
  await page.route('https://api.github.com/repos/hassanme2050/Quran-Arabic-Quiz/contents/**',async route=>{
   assert(decodeURIComponent(new URL(route.request().url()).pathname).endsWith('/Tajweed-Question-Bank.txt'),'Editor must never write another book');
   if(route.request().method()==='PUT'){
    const body=route.request().postDataJSON();assert.equal(body.sha,'sha'+revision);remote=Buffer.from(body.content,'base64').toString('utf8');revision++;puts++;
    return route.fulfill({status:200,contentType:'application/json',body:'{}'});
   }
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({sha:'sha'+revision,content:Buffer.from(remote).toString('base64')})});
  });
  await page.goto(url+'/editor/?book=book_c');assert.equal(await page.locator('#login-book-selector').inputValue(),'book_c');
  await page.locator('#admin-passcode-box').fill(password);await page.locator('#admin-token-box').fill('test-only-token');await page.locator('#verify-open-btn').click();await page.locator('#login-shield-gate').waitFor({state:'hidden'});
  assert.equal(await page.locator('#edit-question-field').inputValue(),records[0].word);assert.equal(await page.locator('#edit-meaning-field').inputValue(),records[0].meaning);
  assert(await page.locator('#edit-arabic-field').isHidden());assert(await page.locator('#publish-words-btn').isHidden());assert.equal(await page.locator('#editor-wrong-answers textarea').count(),6);
  for(let i=0;i<6;i++)assert.equal(await page.locator('#edit-wrong-answer-'+(i+1)).inputValue(),records[0].wrongAnswers[i]);
  await page.locator('#word-target-index').fill('680');await page.locator('#lookup-go-btn').click();assert.equal(await page.locator('#edit-question-field').inputValue(),records.at(-1).word);
  assert((await page.locator('#editor-question-context').textContent()).includes(records.at(-1).subcategory.name));
  await page.locator('#word-target-index').fill('1');await page.locator('#lookup-go-btn').click();
  await page.locator('#edit-wrong-answer-1').fill('Unsaved correction');page.once('dialog',dialog=>dialog.dismiss());await page.locator('#lookup-next-btn').click();assert.equal(await page.locator('#word-target-index').inputValue(),'1');
  page.once('dialog',dialog=>dialog.accept());await page.locator('#lookup-next-btn').click();assert.equal(await page.locator('#word-target-index').inputValue(),'2');assert.equal(puts,0);
  await page.locator('#lookup-prev-btn').click();
  const answer=records[0].meaning+' (reviewed)',wrong=records[0].wrongAnswers[5]+' (reviewed)';
  await page.locator('#edit-question-field').fill(records[0].word+' Reviewed?');await page.locator('#edit-meaning-field').fill(answer);await page.locator('#edit-wrong-answer-6').fill(wrong);
  await page.locator('#commit-save-btn').click();await page.locator('#toast-alert').filter({hasText:'saved to GitHub'}).waitFor();assert.equal(puts,1);
  const saved=parseTajweedBook(remote);assert.equal(saved.records.length,680);assert.equal(saved.records[0].meaning,answer);assert.equal(saved.records[0].wrongAnswers[5],wrong);assert.equal(saved.records[0].category.name,records[0].category.name);
  assert.deepEqual(saved.records.slice(1),records.slice(1));
  await page.screenshot({path:'artifacts/tajweed-editor-'+viewport.width+'.png',fullPage:true});
  await page.locator('#edit-wrong-answer-1').fill(answer);await page.locator('#commit-save-btn').click();await page.locator('#toast-alert').filter({hasText:'all be different'}).waitFor();assert.equal(puts,1);
  await page.locator('#edit-wrong-answer-1').fill(records[0].wrongAnswers[0]);
  remote=replaceTajweedRecord(remote,1,saved.records[0],{...saved.records[0],word:'A newer teacher question?'});revision++;
  await page.locator('#edit-question-field').fill('Local older edit?');await page.locator('#commit-save-btn').click();await page.locator('#toast-alert').filter({hasText:'changed on GitHub'}).waitFor();assert.equal(puts,1);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(editorErrors,[]);
  await page.goto(url+'/test-generator/');assert(await page.locator('option[value="book_c"]').isDisabled());
  await context.close();
 }
 console.log('PASS: Tajweed 680-question library, per-question 1+3 shuffled choices, quiz/review/dictionary, Quest resume and three-book backup/import, Editor all answers/navigation/validation/conflicts and source-preserving mocked saves, Generator exclusion, desktop/mobile without overflow or JavaScript errors.');
}catch(error){if(page)await page.screenshot({path:'artifacts/tajweed-failure.png',fullPage:true}).catch(()=>{});throw error;}
finally{if(browser)await browser.close();server.kill();}
