import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseVocabularyRecords} from '../shared/vocabulary.js?v=1029.26-strawberry1';

const root=new URL('../',import.meta.url);
const vocabulary=fs.readFileSync(new URL('Vocabulary-File.txt',root),'utf8');
const records=parseVocabularyRecords(vocabulary),firstWord=records[0];
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
        assert(await page.locator('#lookup-go-btn').isDisabled());
        assert(await page.locator('#arabic-font-smaller').isDisabled());
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
        assert(await page.locator('#lookup-go-btn').isEnabled(),'GO must be enabled after login');
        const geometry=()=>page.locator('#edit-arabic-field').evaluate(el=>{
            const rect=el.getBoundingClientRect();return {width:rect.width,height:rect.height,font:parseFloat(getComputedStyle(el).fontSize)};
        });
        const initial=await geometry();
        const oldSize=viewport.width<=520?Math.max(36,Math.min(60,viewport.width*.11)):Math.max(40,Math.min(80,viewport.width*.07));
        const step=2*96/72;
        assert(Math.abs(initial.font-(oldSize-step))<.1,'default must be two points smaller');
        assert(Math.abs(initial.height-Math.max(viewport.width<=520?120:155,oldSize*1.8+20))<.1,'initial input size must match the previous layout');
        const sameBox=box=>{assert(Math.abs(box.width-initial.width)<.1);assert(Math.abs(box.height-initial.height)<.1);};
        await page.locator('#arabic-font-larger').click();
        const larger=await geometry();sameBox(larger);assert(Math.abs(larger.font-initial.font-step)<.1);
        const afterFont=await page.locator('.arabic-field-header').evaluate(el=>{
            const caption=el.querySelector('label').getBoundingClientRect(),controls=el.querySelector('.arabic-font-controls').getBoundingClientRect();
            return {captionRight:caption.right,controlsLeft:controls.left,captionCenter:caption.y+caption.height/2,controlsCenter:controls.y+controls.height/2};
        });
        assert(afterFont.controlsLeft>afterFont.captionRight);
        assert(Math.abs(afterFont.captionCenter-afterFont.controlsCenter)<.1);
        await page.locator('#word-target-index').fill('7');await page.locator('#lookup-go-btn').click();
        assert.equal(await page.locator('#edit-arabic-field').inputValue(),records[6].word);
        assert.equal(await page.locator('#edit-meaning-field').inputValue(),records[6].meaning);
        assert.equal((await geometry()).font,larger.font,'font preference must survive loading another word');
        sameBox(await geometry());
        await page.locator('#arabic-font-smaller').click();sameBox(await geometry());
        assert(Math.abs((await geometry()).font-initial.font)<.1);
        await page.locator('#arabic-font-smaller').click();sameBox(await geometry());
        assert(Math.abs((await geometry()).font-initial.font+step)<.1);
        await page.locator('#arabic-font-larger').click();
        await page.locator('#word-target-index').fill('3');await page.locator('#word-target-index').press('Enter');
        assert.equal(await page.locator('#edit-arabic-field').inputValue(),records[2].word);
        await page.locator('#edit-meaning-field').fill('unsaved-test-meaning');
        page.once('dialog',dialog=>dialog.dismiss());
        await page.locator('#word-target-index').fill('2');await page.locator('#lookup-go-btn').click();
        assert.equal(await page.locator('#word-target-index').inputValue(),'3');
        assert.equal(await page.locator('#edit-meaning-field').inputValue(),'unsaved-test-meaning');
        page.once('dialog',dialog=>dialog.accept());
        await page.locator('#word-target-index').fill('2');await page.locator('#lookup-go-btn').click();
        assert.equal(await page.locator('#edit-arabic-field').inputValue(),records[1].word);
        assert(await page.locator('#lookup-go-btn').isEnabled());
        assert.equal(await page.locator('#admin-passcode-box').inputValue(),'');
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        assert.deepEqual(githubRequests,[],'login must not write to GitHub');
        assert.deepEqual(errors,[]);
        await page.screenshot({path:'artifacts/editor-open-'+viewport.width+'.png',fullPage:true});
        await context.close();page=null;
    }
    console.log('PASS: Editor desktop/mobile login, GO/Enter word lookup, unsaved edit protection, two-point font default and controls with fixed input dimensions, failure recovery and no GitHub writes.');
} catch(error) {
    console.error('Editor browser diagnostics:',JSON.stringify({pageErrors,url:page?.url(),loginError:await page?.locator('#login-error').textContent().catch(()=>null)}));
    if(page)await page.screenshot({path:'artifacts/editor-failure.png',fullPage:true}).catch(()=>{});
    throw error;
} finally {if(browser)await browser.close();server.kill();}
