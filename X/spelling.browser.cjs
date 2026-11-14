const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {chromium}=require(require.resolve('playwright',{paths:[__dirname,path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')]}));
const fixtures=JSON.parse(fs.readFileSync(path.join(__dirname,'source/tests/fixtures/library.json'),'utf8'));
const settings={schema:1,books:Object.fromEntries(['book_a','book_b','book_c','book_d'].map(id=>[id,{state:'enable',review:'enable',quiz:'enable',quest:'enable',dictionary:id==='book_c'?'disable':'enable',quizCode:id==='book_c'?'hide':'enable'}]))};
const folder=path.join(__dirname,'test-artifacts');fs.mkdirSync(folder,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const viewport of [{width:390,height:844},{width:1280,height:900}]){
   const context=await browser.newContext({viewport});
   const errors=[];
   await context.route('https://**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.hostname==='api.github.com'&&url.pathname.endsWith('/contents/dbs.json')){
     assert.notEqual(route.request().method(),'PUT','Browser smoke test must never save live settings');
     await route.fulfill({json:{sha:'test-only-sha',content:Buffer.from(JSON.stringify(settings)).toString('base64')}});return;
    }
    if(url.hostname==='raw.githubusercontent.com'){
     const name=decodeURIComponent(url.pathname.split('/').at(-1));
     if(name==='CP.txt'){await route.fulfill({body:Buffer.from('test-only').toString('base64')});return;}
     if(fixtures[name]){await route.fulfill({body:fixtures[name],contentType:'text/plain; charset=utf-8'});return;}
    }
    await route.abort();
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
   await page.waitForFunction(()=>document.querySelector('#status-message').textContent.includes('Loaded 98'));
   assert.equal(await page.locator('#vocabulary-book-selector option').count(),4);
   await page.locator('#opt-last').click();await page.locator('#ten-word-round').selectOption('10');
   await page.screenshot({path:path.join(folder,'spelling-home-'+viewport.width+'.png'),fullPage:true,animations:'disabled'});
   await page.locator('#spelling-mode-button').click();
   assert.equal(await page.locator('#spelling-counter').textContent(),'Question 1 of 8');
   assert.equal(await page.locator('#spelling-answer').getAttribute('lang'),'ar');
   assert.equal(await page.locator('#spelling-prompt').evaluate(e=>getComputedStyle(e).textAlign),'center');
   assert(await page.locator('#spelling-hint').count()===0);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:path.join(folder,'spelling-question-'+viewport.width+'.png'),fullPage:true,animations:'disabled'});
   await page.locator('#spelling-answer').fill('خطأ');
   await page.locator('#spelling-submit-button').click();
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('#spelling-submit-button')).backgroundColor==='rgb(239, 68, 68)');
   await page.waitForFunction(()=>document.querySelector('#spelling-counter').textContent==='Question 2 of 8');
   await page.locator('#spelling-view [data-action="exitToHome"]').click();
   await page.locator('#vocabulary-book-selector').selectOption('book_b');
   await page.waitForFunction(()=>document.querySelector('#status-message').textContent.includes('24 verified'));
   await page.locator('#spelling-mode-button').click();
   assert.equal(await page.locator('#spelling-prompt').getAttribute('lang'),'ur');
   await page.screenshot({path:path.join(folder,'spelling-urdu-'+viewport.width+'.png'),fullPage:true,animations:'disabled'});
   await page.locator('#spelling-view [data-action="exitToHome"]').click();
   await page.locator('#vocabulary-book-selector').selectOption('book_c');
   await page.waitForFunction(()=>document.querySelector('#status-message').textContent.includes('10 verified Tajweed'));
   await page.locator('#spelling-mode-button').click();
   for(const [index,pair] of [['Beautification','تحسين'],['Articulation point','مخرج'],['Letter qualities','صفات']].entries()){
    assert.equal(await page.locator('#spelling-prompt').textContent(),pair[0]);
    await page.locator('#spelling-answer').fill(pair[1]);await page.locator('#spelling-answer').press('Enter');
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('#spelling-submit-button')).backgroundColor==='rgb(16, 185, 129)');
    if(index<2)await page.waitForFunction(i=>document.querySelector('#spelling-counter').textContent==='Question '+i+' of 3',index+2);
   }
   await page.locator('#quiz-finished-view').waitFor({state:'visible'});
   assert.equal(await page.locator('#score-text-value').textContent(),'3/3');
   await page.locator('#toggle-table-btn').click();
   assert.equal(await page.locator('#summary-table-container tbody tr').count(),3);
   assert.equal(await page.locator('.summary-spelling-answer').first().evaluate(e=>getComputedStyle(e).direction),'rtl');
   await page.screenshot({path:path.join(folder,'spelling-result-'+viewport.width+'.png'),fullPage:true,animations:'disabled'});
   await page.goto(pathToFileURL(path.join(__dirname,'admin/index.html')).href);
   await page.locator('#admin-password').fill('test-only');await page.locator('#admin-token').fill('test-only-token');
   await page.locator('#admin-login-button').click();await page.locator('#admin-settings').waitFor({state:'visible'});
   assert.equal(await page.locator('#admin-matrix th').filter({hasText:'Spelling Mode'}).count(),1);
   const control=page.getByRole('button',{name:'Book 1 - A, Spelling Mode: Enable. Click to change.',exact:true});
   await control.click();assert(await page.getByRole('button',{name:'Book 1 - A, Spelling Mode: Disable. Click to change.',exact:true}).count());
   await page.screenshot({path:path.join(folder,'spelling-admin-'+viewport.width+'.png'),fullPage:true,animations:'disabled'});
   assert.deepEqual(errors,[]);
   await context.close();console.log('Browser passed at '+viewport.width+'px: home, Arabic/Urdu spelling, Submit feedback, scorecard and Admin.');
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
