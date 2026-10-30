import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {encodeQuizCode} from '../shared/quiz-codes.js?v=1030.26-strawberry3';
const root=new URL('../',import.meta.url);
const server=spawn(process.execPath,[fileURLToPath(new URL('serve.cjs',root))],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
let browser,page;
try {
 const url=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Server timed out')),10000);
  server.on('error',reject);server.stdout.on('data',buffer=>{const match=String(buffer).match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});
 });
 browser=await chromium.launch({headless:true});fs.mkdirSync('artifacts',{recursive:true});
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]) {
  const context=await browser.newContext({viewport,locale:'en-US',timezoneId:'UTC',permissions:['clipboard-read','clipboard-write'],acceptDownloads:true});
  page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install({time:new Date('2026-10-29T12:00:00Z')});
  await page.goto(url);await page.locator('#menu-view:not(.hidden)').waitFor();
  const bookLabel='Book A - 500 Arabic Word (Arabic to English)';
  assert.equal(await page.locator('#vocabulary-book-selector option[value="book_a"]').textContent(),bookLabel);
  assert.equal(await page.locator('#quest-book-selector option[value="book_a"]').textContent(),bookLabel);
  await page.clock.pauseAt(new Date('2026-10-29T13:00:00Z'));
  const code=encodeQuizCode(Array.from({length:20},(_,i)=>i+1));
  await page.locator('#quiz-code-field').fill('bad-code');await page.locator('#quiz-code-btn').click();
  assert(await page.locator('#quiz-code-error').isVisible());assert(await page.locator('#quiz-participant-view').isHidden());
  await page.locator('#quiz-code-field').fill(code);await page.locator('#quiz-code-btn').click();
  await page.locator('#quiz-participant-view:not(.hidden)').waitFor();
  assert.equal(await page.locator('#participant-name').evaluate(el=>getComputedStyle(el).textAlign),'center');
  assert.equal(await page.locator('.participant-note').count(),0);
  await page.locator('#participant-start-btn').click();assert(await page.locator('#participant-error').textContent());
  await page.locator('#participant-name').fill('Cancelled attempt');await page.locator('#participant-start-btn').click();
  assert.equal(await page.locator('#quiz-countdown-number').textContent(),'3');
  await page.locator('#quiz-countdown-view button').click();await page.clock.fastForward(10000);
  assert(await page.locator('#menu-view').isVisible());assert(await page.locator('#quiz-view').isHidden());
  await page.locator('#quiz-code-btn').click();assert.equal(await page.locator('#participant-name').inputValue(),'');
  await page.clock.fastForward(120000);
  await page.locator('#participant-name').fill('Noor Hassan');await page.locator('#participant-name').press('Enter');
  for(const next of ['2','1']){await page.clock.fastForward(1000);assert.equal(await page.locator('#quiz-countdown-number').textContent(),next);assert(await page.locator('#quiz-view').isHidden());}
  await page.clock.fastForward(1000);await page.locator('#quiz-view:not(.hidden)').waitFor();
  assert.equal(await page.locator('.quiz-word-card #quiz-time-badge').count(),0);
  assert.equal(await page.locator('#quiz-view > .quiz-topline #quiz-time-badge').count(),1);
  assert.equal(await page.locator('.quiz-time-caption').count(),0);
  assert.equal(await page.locator('#quiz-time-badge').evaluate(el=>getComputedStyle(el).borderTopWidth),'0px');
  assert((await page.locator('#quiz-time-badge').boundingBox()).height<30);
  assert((await page.locator('#quiz-counter').boundingBox()).y<(await page.locator('#quiz-arabic-field').boundingBox()).y);
  assert((await page.locator('#quiz-view > .quiz-topline').boundingBox()).y+(await page.locator('#quiz-view > .quiz-topline').boundingBox()).height<=(await page.locator('.quiz-word-card').boundingBox()).y);
  assert.equal(await page.locator('#quiz-elapsed-time').textContent(),'00:00');
  await page.clock.fastForward(2500);assert.equal(await page.locator('#quiz-elapsed-time').textContent(),'00:02');
  await page.screenshot({path:'artifacts/coded-quiz-timer-'+viewport.width+'.png',fullPage:true});
  async function answerAll(count) {
   for(let i=0;i<count;i++){
    const item=await page.evaluate(async()=>{const {state}=await import('/js/state.js?v=1030.26-strawberry3');return state.sessionWords[state.currentIndex];});
    const choices=await page.locator('#quiz-options-box button').allTextContents();
    const index=choices.indexOf(item.meaning);assert(index>=0);
    await page.locator('#quiz-options-box button').nth(index).click();
    await page.clock.fastForward(1200);
   }
   await page.locator('#quiz-finished-view:not(.hidden)').waitFor();
  }
  await answerAll(20);
  assert.equal(await page.locator('#score-text-value').textContent(),'20/20');
  assert.equal(await page.locator('#scorecard-participant-name').textContent(),'Noor Hassan');
  assert((await page.locator('#scorecard-date').textContent()).includes('Oct 29, 2026'));
  assert.equal(await page.locator('#scorecard-time').textContent(),'00:25','countdown/name wait and final feedback must be excluded');
  assert((await page.locator('#scorecard-code').textContent()).includes(code));
  assert((await page.locator('#scorecard-code').textContent()).includes(bookLabel));
  assert.equal(await page.locator('#scorecard-share-btn, #scorecard-download-btn').count(),0);
  await page.clock.fastForward(60000);assert.equal(await page.locator('#scorecard-time').textContent(),'00:25');
  await page.clock.resume();
  await page.locator('#scorecard-copy-btn').click();
  await page.locator('#scorecard-export-status').filter({hasText:'Copied!'}).waitFor();
  const copied=await page.evaluate(async()=>{
   const items=await navigator.clipboard.read(),item=items.find(item=>item.types.includes('image/png'));
   if(!item)throw Error('Clipboard is missing PNG image');
   const blob=await item.getType('image/png'),bitmap=await createImageBitmap(blob);
   return {width:bitmap.width,height:bitmap.height,data:btoa(Array.from(new Uint8Array(await blob.arrayBuffer()),b=>String.fromCharCode(b)).join(''))};
  });
  assert(copied.width>=600&&copied.height>250);fs.writeFileSync('artifacts/scorecard-clipboard-'+viewport.width+'.png',Buffer.from(copied.data,'base64'));
  await page.evaluate(()=>{
   const message=document.createElement('div');message.id='teacher-message-test';message.contentEditable='true';message.textContent='Paste score here';document.body.appendChild(message);
   message.addEventListener('paste',event=>{window.pastedScoreType=[...event.clipboardData.items].find(item=>item.kind==='file')?.type;});
  });
  await page.locator('#teacher-message-test').focus();await page.keyboard.press('Control+V');
  await page.waitForFunction(()=>window.pastedScoreType==='image/png');
  await page.locator('#teacher-message-test').evaluate(el=>el.remove());
  await page.evaluate(()=>{
   const NativeItem=window.ClipboardItem;window.nativeScoreClipboardItem=NativeItem;
   window.ClipboardItem=function(data){
    if(data['image/png'] instanceof Promise)throw new TypeError('Promise items unsupported');
    window.usedBlobClipboardFallback=true;return new NativeItem(data);
   };
  });
  await page.locator('#scorecard-copy-btn').click();
  await page.waitForFunction(()=>window.usedBlobClipboardFallback===true);
  await page.locator('#scorecard-copy-btn:not([disabled])').waitFor();
  assert((await page.locator('#scorecard-export-status').textContent()).includes('Copied!'));
  await page.evaluate(()=>{window.ClipboardItem=window.nativeScoreClipboardItem;});
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{write(){return Promise.reject(new DOMException('Blocked','NotAllowedError'));}}}));
  const fallbackEvent=page.waitForEvent('download');await page.locator('#scorecard-copy-btn').click();
  const fallback=await fallbackEvent;assert(fallback.suggestedFilename().endsWith('.png'));
  await page.locator('#scorecard-export-status').filter({hasText:'Clipboard unavailable'}).waitFor();
  assert.equal(await page.locator('#scorecard-time').textContent(),'00:25');
  await page.screenshot({path:'artifacts/coded-quiz-result-'+viewport.width+'.png',fullPage:true});
  await page.locator('#quiz-finished-view [data-action="exitToHome"]').click();
  await page.selectOption('#vocabulary-book-selector','book_b');
  await page.locator('#status-message').filter({hasText:'verified words'}).waitFor();
  const bCode=encodeQuizCode(Array.from({length:10},(_,i)=>i+1),'book_b');
  await page.locator('#quiz-code-field').fill(bCode);await page.locator('#quiz-code-btn').click();
  await page.locator('#quiz-participant-view:not(.hidden)').waitFor();assert.equal(await page.locator('#participant-name').inputValue(),'');
  await page.clock.pauseAt(new Date('2026-10-29T14:00:00Z'));
  const student='علی حسن';await page.locator('#participant-name').fill(student);await page.locator('#participant-start-btn').click();
  for(let i=0;i<3;i++)await page.clock.fastForward(1000);
  await answerAll(10);
  assert.equal(await page.locator('#score-text-value').textContent(),'10/10');assert.equal(await page.locator('#scorecard-participant-name').textContent(),student);
  assert((await page.locator('#scorecard-code').textContent()).includes('Book B'));
  assert.equal(await page.locator('#scorecard-time').textContent(),'00:10');
  await page.locator('#quiz-finished-view [data-action="exitToHome"]').click();
  await page.getByRole('button',{name:'Quiz Mode',exact:true}).click();
  assert(await page.locator('#quiz-view').isVisible());assert(await page.locator('#quiz-time-badge').isHidden());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  for(const app of ['editor','test-generator']){
   await page.goto(url+'/'+app+'/');
   assert.equal(await page.locator('option[value="book_a"]').textContent(),bookLabel);
  }
  await context.close();page=null;
 }
 console.log('PASS: centered participant name, compact timer above the card, code-to-name/countdown/timing, both books, renamed Book A across all apps, actual PNG clipboard write/read/paste, Blob compatibility retry, download fallback and simplified scorecard on desktop/mobile.');
}catch(error){if(page)await page.screenshot({path:'artifacts/coded-quiz-failure.png',fullPage:true}).catch(()=>{});throw error;}
finally{if(browser)await browser.close();server.kill();}
