import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseVocabularyRecords} from '../shared/vocabulary.js?v=1029.26-strawberry1';

const root=new URL('../',import.meta.url);
const vocabulary=fs.readFileSync(new URL('Vocabulary-File.txt',root),'utf8');
const firstWord=parseVocabularyRecords(vocabulary)[0];
const password='test-only-\u0627\u0644\u0641';
const cp='\uFEFF'+Buffer.from('another-test-password').toString('base64')+'\r\n\r\n'+Buffer.from(password).toString('base64')+'\r\n';
const server=spawn(process.execPath,[fileURLToPath(new URL('serve.cjs',root))],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
let browser,page;
let pageErrors=[];
try {
    const url=await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(Error('Preview startup timed out')),10000);
        server.on('error',reject);
        server.stdout.on('data',buffer=>{const match=String(buffer).match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});
        server.on('exit',code=>reject(Error('Preview exited '+code)));
    });
    browser=await chromium.launch({headless:true});
    fs.mkdirSync('artifacts',{recursive:true});
    for(const viewport of [{width:1280,height:900},{width:390,height:844}]) {
        const context=await browser.newContext({viewport});page=await context.newPage();
        const errors=[],githubRequests=[];let mode='success',passwordRequests=0;
        pageErrors=errors;
        page.on('pageerror',error=>errors.push(error.message));
        await page.route('https://api.github.com/**',route=>{githubRequests.push(route.request().method());return route.abort();});
        await page.route('**/CP.txt',route=>{
            passwordRequests++;
            assert.equal(new URL(route.request().url()).pathname,'/CP.txt');
            assert.equal(route.request().headers().authorization,undefined);
            return route.fulfill({status:mode==='unavailable'?503:200,contentType:'text/plain; charset=utf-8',body:mode==='empty'?'\r\n ':cp});
        });
        await page.route('**/Vocabulary-File.txt',route=>route.fulfill({status:mode==='vocabulary-failed'?503:200,contentType:'text/plain; charset=utf-8',body:vocabulary}));
        await page.goto(url+'/Editor.html');
        await page.locator('#editor-login-form').waitFor();
        await page.locator('#verify-open-btn:enabled').waitFor();
        assert(new URL(page.url()).pathname.endsWith('/editor/index.html'));
        assert(await page.locator('#login-book-selector option[value="book_b"]').isDisabled());
        assert(await page.locator('#edit-arabic-field').isDisabled());
        await page.locator('#admin-passcode-box').fill(password);
        await page.locator('#admin-passcode-box').press('Enter');
        await page.locator('#login-error').filter({hasText:'Please enter your GitHub token.'}).waitFor();
        assert.equal(passwordRequests,0);
        await page.locator('#admin-token-box').fill('test-only-token');
        await page.locator('#admin-passcode-box').fill('wrong-test-password');
        await page.locator('#verify-open-btn').click();
        await page.locator('#login-error').filter({hasText:'Invalid password.'}).waitFor();
        assert.equal(await page.locator('#admin-passcode-box').inputValue(),'');
        assert(await page.locator('#login-shield-gate').isVisible());
        await page.screenshot({path:'artifacts/editor-login-'+viewport.width+'.png',fullPage:true});
        for(const [failure,message] of [['unavailable','Unable to verify password.'],['empty','No passwords are configured.'],['vocabulary-failed','Vocabulary file could not be loaded.']]) {
            mode=failure;
            await page.locator('#admin-passcode-box').fill(password);
            await page.locator('#admin-token-box').press('Enter');
            await page.locator('#login-error').filter({hasText:message}).waitFor();
            assert(await page.locator('#login-shield-gate').isVisible());
            assert(await page.locator('#verify-open-btn').isEnabled());
            assert(await page.locator('#edit-arabic-field').isDisabled());
        }
        mode='success';
        await page.locator('#admin-passcode-box').fill(' '+password+' ');
        await page.locator('#admin-passcode-box').press('Enter');
        await page.locator('#login-shield-gate').waitFor({state:'hidden'});
        assert.equal(await page.locator('#login-error').textContent(),'');
        assert.equal(await page.locator('#edit-arabic-field').inputValue(),firstWord.word);
        assert.equal(await page.locator('#edit-meaning-field').inputValue(),firstWord.meaning);
        assert(await page.locator('#commit-save-btn').isEnabled());
        assert.equal(await page.locator('#admin-passcode-box').inputValue(),'');
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        assert.deepEqual(githubRequests,[],'login must not write to GitHub');
        assert.deepEqual(errors,[]);
        await page.screenshot({path:'artifacts/editor-open-'+viewport.width+'.png',fullPage:true});
        await context.close();page=null;
    }
    console.log('PASS: Editor desktop/mobile configured UTF-8 password, invalid/missing inputs, Enter/button submission, CP/vocabulary failure recovery, unchanged Book B lock and no GitHub writes.');
} catch(error) {
    console.error('Editor browser diagnostics:',JSON.stringify({pageErrors,url:page?.url(),loginError:await page?.locator('#login-error').textContent().catch(()=>null)}));
    if(page)await page.screenshot({path:'artifacts/editor-failure.png',fullPage:true}).catch(()=>{});
    throw error;
} finally {if(browser)await browser.close();server.kill();}
