import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
const root=new URL('../',import.meta.url);
const source=fs.readFileSync(new URL('Lughat-AlQuran-word-meaning.txt',root),'utf8');
const lines=source.split(/\r?\n/);const boundaryIndex=lines.findIndex(line=>/^0021\s/.test(line));
const fixture=[...lines.slice(0,boundaryIndex),'-----',...lines.slice(boundaryIndex)].join('\n');
const server=spawn(process.execPath,[new URL('serve.cjs',root).pathname],{env:{...process.env,PORT:'8136'},stdio:'pipe'});
const browser=await chromium.launch({headless:true});
fs.mkdirSync('artifacts',{recursive:true});
try {
 for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:8136')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]) {
  const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:8136');
  await page.waitForFunction(()=>!document.querySelector('#menu-view').classList.contains('hidden'));
  await page.selectOption('#vocabulary-book-selector','book_b');
  await page.waitForFunction(()=>document.querySelector('#status-message').textContent.includes('1858'));
  assert(await page.getByRole('button',{name:'Quiz Mode',exact:true}).isDisabled());
  assert(await page.getByRole('button',{name:'Review Mode',exact:true}).isDisabled());
  await page.getByRole('button',{name:'Dictionary Mode',exact:true}).click();
  assert.equal(await page.locator('.dictionary-entry').count(),1858);
  assert.equal(await page.locator('.dictionary-entry.unverified').count(),1858);
  await page.locator('#dict-sort-number').click();
  assert((await page.locator('.dictionary-meta').first().textContent()).includes('#0001'));
  assert.equal(await page.locator('.dictionary-meaning').first().getAttribute('dir'),'rtl');
  await page.locator('#dict-sort-english').click();
  await page.screenshot({path:'artifacts/dictionary-'+viewport.width+'.png',fullPage:true});
  await page.getByRole('button',{name:'Go to Home'}).click();
  await page.route('**/Lughat-AlQuran-word-meaning.txt',route=>route.fulfill({status:200,contentType:'text/plain; charset=utf-8',body:fixture}));
  await page.selectOption('#vocabulary-book-selector','book_a');
  await page.waitForFunction(()=>document.querySelector('#status-message').textContent.includes('88'));
  await page.selectOption('#vocabulary-book-selector','book_b');
  await page.waitForFunction(()=>document.querySelector('#status-message').textContent.startsWith('20 verified'));
  await page.getByRole('button',{name:'Review Mode',exact:true}).click();
  await page.getByRole('button',{name:'Show Meaning',exact:true}).click();
  assert.equal(await page.locator('#card-meaning-field').getAttribute('dir'),'rtl');
  await page.screenshot({path:'artifacts/review-'+viewport.width+'.png',fullPage:true});
  await page.getByRole('button',{name:'Exit to Menu'}).click();
  await page.getByRole('button',{name:'Quiz Mode',exact:true}).click();
  for(let i=0;i<10;i++) {
   const item=await page.evaluate(async()=>{const {state}=await import('/js/state.js');return state.sessionWords[state.currentIndex];});
   assert(item.number<=20);assert(item.verified);
   await page.getByRole('button',{name:item.meaning,exact:true}).click();
   if(i===0)await page.screenshot({path:'artifacts/quiz-'+viewport.width+'.png',fullPage:true});
   if(i<9)await page.waitForFunction(n=>document.querySelector('#quiz-counter').textContent==='Question '+n+' of 10',i+2);
  }
  await page.waitForFunction(()=>!document.querySelector('#quiz-finished-view').classList.contains('hidden'));
  assert.equal(await page.locator('#score-text-value').textContent(),'10/10');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.getByRole('button',{name:'Go to Home'}).click();
  await page.selectOption('#vocabulary-book-selector','book_a');
  await page.waitForFunction(()=>document.querySelector('#status-message').textContent.includes('88'));
  assert(await page.getByRole('button',{name:'Quiz Mode',exact:true}).isEnabled());
  assert.deepEqual(errors,[]);
  await context.close();
 }
 console.log('Peaches Chromium desktop/mobile passed: real-file dictionary, verified fixture review/quiz, book switching and no JS errors.');
} finally {await browser.close();server.kill();}
