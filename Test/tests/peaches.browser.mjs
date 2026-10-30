import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseVocabularyRecords} from '../shared/vocabulary.js?v=1029.26-strawberry9';
import {parseLughatBook} from '../shared/lughat.js?v=1029.26-strawberry9';
const root=new URL('../',import.meta.url);
const bookARecords=parseVocabularyRecords(fs.readFileSync(new URL('Vocabulary-File.txt',root),'utf8'));
const bookACount=bookARecords.length;
const source=fs.readFileSync(new URL('Lughat-AlQuran-word-meaning.txt',root),'utf8');
const actualUnverified=parseLughatBook(source).records.filter(record=>!record.verified).length;
const lines=source.split(/\r?\n/).filter(line=>!/^\s*-{5,}/.test(line));const boundaryIndex=lines.findIndex(line=>/^0021\s/.test(line));
const fixture=[...lines.slice(0,boundaryIndex),'-----',...lines.slice(boundaryIndex)].join('\n');
const server=spawn(process.execPath,[fileURLToPath(new URL('serve.cjs',root))],{env:{...process.env,PORT:'8136'},stdio:'pipe'});
const browser=await chromium.launch({headless:true});
fs.mkdirSync('artifacts',{recursive:true});
try {
 for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:8136')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]) {
  const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const selectSort=async(mode,reopen=false)=>{
   await page.locator('#dict-sort-'+mode).click();
   assert(await page.locator('#dictionary-search').isHidden());
   assert.equal(await page.locator('#dictionary-search').inputValue(),'');
   assert.equal(await page.locator('#dictionary-search-toggle').getAttribute('aria-pressed'),'false');
   assert.equal(await page.locator('#dictionary-toolbar button.active').count(),1);
   assert.equal(await page.locator('#dict-sort-'+mode).getAttribute('aria-pressed'),'true');
   assert(await page.locator('#dictionary-search').evaluate(el=>el!==document.activeElement));
   if(reopen){
    await page.locator('#dictionary-search-toggle').click();
    assert.equal(await page.locator('#dictionary-toolbar button.active').count(),1);
    assert.equal(await page.locator('#dictionary-toolbar > button.active').count(),0);
    assert.equal(await page.locator('#dictionary-search-toggle').getAttribute('aria-pressed'),'true');
   }
  };
  await page.goto('http://127.0.0.1:8136');
  await page.waitForFunction(()=>!document.querySelector('#menu-view').classList.contains('hidden'));
  await page.selectOption('#vocabulary-book-selector','book_b');
  await page.waitForFunction(()=>document.querySelector('#status-message').textContent.includes('1858'));
  assert(await page.getByRole('button',{name:'Quiz Mode',exact:true}).isEnabled());
  assert(await page.getByRole('button',{name:'Review Mode',exact:true}).isEnabled());
  const homeModeHeight=await page.getByRole('button',{name:'Dictionary Mode',exact:true}).evaluate(el=>el.getBoundingClientRect().height);
  await page.getByRole('button',{name:'Dictionary Mode',exact:true}).click();
  assert.equal(await page.locator('.dictionary-entry').count(),1858);
  assert.equal(await page.locator('.dictionary-entry.unverified').count(),actualUnverified);
  await selectSort('number',false);
  assert.equal(await page.locator('.dictionary-meta').count(),0);
  assert.equal(await page.locator('.dictionary-note').count(),0);
  assert.equal(await page.locator('.dictionary-meaning').first().getAttribute('dir'),'rtl');
  assert(await page.locator('#dictionary-search').isHidden());
  const controlGeometry=()=>page.locator('#dictionary-toolbar').evaluate(el=>({height:el.getBoundingClientRect().height,heights:[...el.querySelectorAll(':scope > button,#dictionary-search-toggle')].map(b=>b.getBoundingClientRect().height)}));
  const collapsed=await controlGeometry();
  assert(collapsed.heights.every(h=>Math.abs(h-homeModeHeight)<.1),'dictionary controls must match home mode height');
  for(const selector of ['#dict-sort-number','#dict-sort-english','#dict-sort-arabic','#dictionary-search-toggle']) {
   await page.locator(selector).hover();
   assert.equal(await page.locator(selector).evaluate(el=>getComputedStyle(el).transform),'none');
  }
  await page.mouse.move(0,0);
  await page.waitForTimeout(250);
  assert.equal(await page.locator('#dictionary-search-toggle').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
  await page.locator('#dictionary-search-toggle').click();
  const expanded=await controlGeometry();
  assert(expanded.heights.every(h=>Math.abs(h-collapsed.heights[0])<.1));
  assert.equal(expanded.height,collapsed.height);
  console.log(JSON.stringify({viewport:viewport.width,homeModeHeight,collapsed:collapsed.heights,expanded:expanded.heights,toolbarHeight:expanded.height}));
  assert.equal(await page.locator('#dictionary-search-toggle').evaluate(el=>getComputedStyle(el).transform),'none');
  assert(await page.locator('#dictionary-search').evaluate(el=>el===document.activeElement));
  assert.equal(await page.locator('#dictionary-search-toggle').getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('#dictionary-toolbar button.active').count(),1);
  assert.equal(await page.locator('#dictionary-toolbar > button.active').count(),0);
  assert.equal(await page.locator('#dictionary-search-close').count(),0);
  assert.equal(await page.locator('#dictionary-keyboard').count(),0);
  await page.locator('#dictionary-search').fill('۰۰۰۱');
  assert.equal(await page.locator('.dictionary-entry').count(),1);
  await page.locator('#dictionary-search').press('Enter');
  assert.equal(await page.locator('.dictionary-entry').count(),1);
  await selectSort('arabic',true);
  await page.locator('#dictionary-search').click();
  assert.equal(await page.locator('#dictionary-search').getAttribute('lang'),'ar');
  await page.locator('#dictionary-search').fill('ل');
  assert.equal(await page.locator('#dictionary-search').inputValue(),'ل');
  assert(await page.locator('.dictionary-entry').count()>0);
  assert(await page.locator('.dictionary-entry').count()<1858);
  await page.screenshot({path:'artifacts/search-arabic-'+viewport.width+'.png',fullPage:true});
  await page.locator('#dictionary-search').fill('');
  assert.equal(await page.locator('.dictionary-entry').count(),1858);
  await selectSort('english',true);
  await page.locator('#dictionary-search').click();
  assert.equal(await page.locator('#dictionary-search').getAttribute('lang'),'ur');
  await page.locator('#dictionary-search').fill('ک');
  assert.equal(await page.locator('#dictionary-search').inputValue(),'ک');
  await page.screenshot({path:'artifacts/search-urdu-'+viewport.width+'.png',fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#dictionary-search').fill('');
  await selectSort('english',false);
  assert(await page.locator('#dictionary-search').isHidden());
  assert.equal(await page.locator('#dictionary-search-toggle').getAttribute('aria-expanded'),'false');
  await page.screenshot({path:'artifacts/dictionary-'+viewport.width+'.png',fullPage:true});
  await page.getByRole('button',{name:'Go to Home'}).click();
  await page.route('**/Lughat-AlQuran-word-meaning.txt',route=>route.fulfill({status:200,contentType:'text/plain; charset=utf-8',body:fixture}));
  await page.selectOption('#vocabulary-book-selector','book_a');
  await page.waitForFunction(n=>document.querySelector('#status-message').textContent.includes(' '+n+' words'),bookACount);
  await page.selectOption('#vocabulary-book-selector','book_b');
  await page.waitForFunction(()=>document.querySelector('#status-message').textContent.includes('20 verified'));
  await page.getByRole('button',{name:'Review Mode',exact:true}).click();
  await page.getByRole('button',{name:'Show Meaning',exact:true}).click();
  assert.equal(await page.locator('#card-meaning-field').getAttribute('dir'),'rtl');
  await page.screenshot({path:'artifacts/review-'+viewport.width+'.png',fullPage:true});
  await page.getByRole('button',{name:'Exit to Menu'}).click();
  await page.getByRole('button',{name:'Quiz Mode',exact:true}).click();
  for(let i=0;i<10;i++) {
   const item=await page.evaluate(async()=>{const {state}=await import('/js/state.js?v=1029.26-strawberry9');return state.sessionWords[state.currentIndex];});
   assert(item.number<=20);assert(item.verified);
   await page.getByRole('button',{name:item.meaning,exact:true}).click();
   if(i===0)await page.screenshot({path:'artifacts/quiz-'+viewport.width+'.png',fullPage:true});
   if(i<9)await page.waitForFunction(n=>document.querySelector('#quiz-counter').textContent==='Question '+n+' of 10',i+2);
  }
  await page.waitForFunction(()=>!document.querySelector('#quiz-finished-view').classList.contains('hidden'));
  assert.equal(await page.locator('#score-text-value').textContent(),'10/10');
  await page.locator('#toggle-table-btn').click();
  // Exercise a wrong-answer marker too, without changing the completed quiz score.
  await page.locator('.summary-table tbody tr:last-child td:nth-child(2)').evaluate(el=>{el.className='classic-indicator-fail';el.textContent=String.fromCharCode(10007);});
  const tableGeometry=await page.locator('.summary-table').evaluate(table=>{
   const headers=[...table.tHead.rows[0].cells].map(c=>c.getBoundingClientRect());
   return [...table.tBodies[0].rows].map(row=>[...row.cells].map((cell,i)=>{
    const box=cell.getBoundingClientRect();
    return {display:getComputedStyle(cell).display,x:box.x,width:box.width,y:box.y,height:box.height,headerX:headers[i].x,headerWidth:headers[i].width};
   }));
  });
  assert.equal(tableGeometry.length,10);
  for(const row of tableGeometry){
   assert.equal(row.length,5);
   for(const cell of row){
    assert.equal(cell.display,'table-cell');
    assert(Math.abs(cell.x-cell.headerX)<1);
    assert(Math.abs(cell.width-cell.headerWidth)<1);
    assert(Math.abs(cell.y-row[0].y)<1);
    assert(Math.abs(cell.height-row[0].height)<1);
   }
  }
  await page.screenshot({path:'artifacts/performance-summary-'+viewport.width+'.png',fullPage:true});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.getByRole('button',{name:'Go to Home'}).click();
  await page.selectOption('#vocabulary-book-selector','book_a');
  await page.waitForFunction(n=>document.querySelector('#status-message').textContent.includes(' '+n+' words'),bookACount);
  assert(await page.getByRole('button',{name:'Quiz Mode',exact:true}).isEnabled());
  await page.getByRole('button',{name:'Dictionary Mode',exact:true}).click();
  await selectSort('english',true);
  await page.locator('#dictionary-search-toggle').click();
  assert.equal(await page.locator('#dictionary-search').getAttribute('lang'),'en');
  await selectSort('arabic',true);
  await page.locator('#dictionary-search').fill('1');
  assert.equal(await page.locator('.dictionary-word').first().textContent(),bookARecords[0].word);
  await page.locator('#dictionary-search').fill(bookARecords[0].meaning);
  assert.equal(await page.locator('.dictionary-meaning').first().textContent(),bookARecords[0].meaning);
  await selectSort('number',true);
  assert.equal(await page.locator('#dictionary-search').inputValue(),'');
  assert.equal(await page.locator('.dictionary-meaning').first().textContent(),bookARecords[0].meaning);
  await page.locator('#dictionary-search').fill(bookARecords[0].word);
  assert.equal(await page.locator('.dictionary-word').first().textContent(),bookARecords[0].word);
  await page.locator('#dictionary-search').fill('q');
  assert.equal(await page.locator('#dictionary-search').inputValue(),'q');
  await page.locator('#dictionary-search').fill('zzzzzzzz');
  assert.equal(await page.locator('.dictionary-entry').count(),0);
  assert(await page.locator('.dictionary-empty').isVisible());
  await page.locator('#dictionary-search').fill('');
  assert.equal(await page.locator('.dictionary-entry').count(),bookACount);
  await selectSort('number',true);
  assert.equal(await page.locator('#dictionary-keyboard').count(),0);
  await page.waitForTimeout(320);
  const geometry=await page.locator('#dictionary-toolbar').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth,buttons:[...el.querySelectorAll(':scope > button')].map(b=>({width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}))}));
  assert(geometry.scroll<=geometry.width);
  for(const b of geometry.buttons)assert(Math.abs(b.width-b.height)<2);
  await page.locator('#dictionary-search').press('Escape');
  assert(await page.locator('#dictionary-search').isHidden());
  assert.deepEqual(errors,[]);
  await context.close();
 }
 console.log('Peaches Chromium desktop/mobile passed: real-file dictionary, verified fixture review/quiz, book switching and no JS errors.');
} finally {await browser.close();server.kill();}
