import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseVocabularyRecords} from '../shared/vocabulary.js?v=1029.26-strawberry1';
import {parseLughatBook} from '../shared/lughat.js?v=1029.26-strawberry1';
import {withVerificationAt} from './book-b-fixture.mjs';

const root=new URL('../',import.meta.url);
const vocabulary=fs.readFileSync(new URL('Vocabulary-File.txt',root),'utf8');
const bookBSource=withVerificationAt(fs.readFileSync(new URL('Lughat-AlQuran-word-meaning.txt',root),'utf8'),20);
const records=parseVocabularyRecords(vocabulary),firstWord=records[0];
const password='test-only-\u0627\u0644\u0641';
const cp='\uFEFF'+Buffer.from('another-test-password').toString('base64')+'\r\n\r\n'+Buffer.from(password).toString('base64')+'\r\n';
const server=spawn(process.execPath,[fileURLToPath(new URL('serve.cjs',root))],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
let browser,page;
let pageErrors=[];
async function inkProfile(png) {
    return page.evaluate(async base64=>{
        const bytes=Uint8Array.from(atob(base64),char=>char.charCodeAt(0));
        const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
        const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
        const context=canvas.getContext('2d');context.drawImage(bitmap,0,0);bitmap.close();
        const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
        let top=canvas.height,bottom=-1,left=canvas.width,right=-1;
        for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++) {
            const i=(y*canvas.width+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];
            // Match the Arabic text's teal ink, excluding borders, background and focus rings.
            if(r<200&&g-r>15&&Math.abs(g-b)<8) {
                top=Math.min(top,y);bottom=Math.max(bottom,y);left=Math.min(left,x);right=Math.max(right,x);
            }
        }
        return {height:bottom<0?0:bottom-top+1,width:right<0?0:right-left+1};
    },png.toString('base64'));
}
async function checkHarakat(setting,width) {
    const field=page.locator('#edit-arabic-field'),original=await field.inputValue();
    const samples=['\u0625\u0650\u0646\u0651\u064E','\u0644\u0650\u0644\u0651\u0670\u0647\u0650'];
    try {
        for(const [index,sample] of samples.entries()) {
            await field.fill(sample);await field.evaluate(el=>el.blur());
            const actual=await field.screenshot(index===0?{path:'artifacts/editor-harakat-'+setting+'-'+width+'.png'}:{});
            const reference=await field.evaluate((el,text)=>{
                const style=getComputedStyle(el),context=document.createElement('canvas').getContext('2d');
                context.font=style.fontWeight+' '+style.fontSize+' '+style.fontFamily;
                if(!context.font.includes(style.fontSize))throw Error('Canvas font did not match the Arabic field');
                context.direction=style.direction;context.textAlign='center';
                const bounds=context.measureText(text);
                return {height:bounds.actualBoundingBoxAscent+bounds.actualBoundingBoxDescent,width:bounds.actualBoundingBoxLeft+bounds.actualBoundingBoxRight};
            },sample);
            const ink=await inkProfile(actual);
            assert(reference.height>0&&ink.height>0,'Arabic ink must be visible');
            // The user requested the original field styling back, including its native input rendering.
            // Keep the remaining clipping visible in diagnostics while checking the restored UI and Editor workflow.
            if(ink.height<reference.height-2)console.warn('KNOWN EDITOR RENDERING: original input clips some harakat at '+width+': '+JSON.stringify({ink,reference}));
            if(ink.width<reference.width-2)console.warn('KNOWN EDITOR RENDERING: original input has an ink-width difference at '+width+': '+JSON.stringify({ink,reference}));
        }
    } finally {
        await field.fill(original);await field.evaluate(el=>el.blur());
    }
}
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
        assert(await page.locator('#login-book-selector option[value="book_b"]').isEnabled());
        assert(await page.locator('#edit-arabic-field').isDisabled());
        assert(await page.locator('#lookup-go-btn').isDisabled());
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
        assert.equal(await page.locator('.arabic-font-controls,.font-step-button').count(),0);
        const restored=await page.locator('#edit-arabic-field').evaluate(el=>({font:parseFloat(getComputedStyle(el).fontSize),padding:getComputedStyle(el).paddingTop}));
        const oldSize=viewport.width<=520?Math.max(36,Math.min(60,viewport.width*.11)):Math.max(40,Math.min(80,viewport.width*.07));
        assert(Math.abs(restored.font-oldSize)<.1);assert.equal(restored.padding,'8px');
        assert(await page.locator('#publish-words-btn').isVisible());
        assert(await page.locator('#publish-words-btn').isDisabled());
        const placement=await page.locator('#publish-words-btn').evaluate(el=>({previous:el.previousElementSibling.id,gap:el.getBoundingClientRect().top-document.querySelector('#commit-save-btn').getBoundingClientRect().bottom}));
        assert.equal(placement.previous,'commit-save-btn');assert(placement.gap>=0&&placement.gap<=20);
        assert.equal(await page.locator('#publish-words-btn').textContent(),'Make available');
        await page.locator('#word-target-index').fill('7');await page.locator('#lookup-go-btn').click();
        assert.equal(await page.locator('#edit-arabic-field').inputValue(),records[6].word);
        assert.equal(await page.locator('#edit-meaning-field').inputValue(),records[6].meaning);
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
        await checkHarakat('restored',viewport.width);
        assert.equal(await page.locator('#admin-passcode-box').inputValue(),'');
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        assert.deepEqual(githubRequests,[],'login must not write to GitHub');
        assert.deepEqual(errors,[]);
        await page.screenshot({path:'artifacts/editor-open-'+viewport.width+'.png',fullPage:true});
        let bookBText=bookBSource,revision=1,puts=0,gets=0,conflict=false;
        await page.unroute('https://api.github.com/**');
        await page.route('**/Lughat-AlQuran-word-meaning.txt',route=>route.fulfill({status:200,contentType:'text/plain; charset=utf-8',body:bookBText}));
        await page.route('https://api.github.com/**',async route=>{
            assert(new URL(route.request().url()).pathname.endsWith('/Lughat-AlQuran-word-meaning.txt'));
            if(route.request().method()==='GET') {
                gets++;return route.fulfill({status:200,json:{sha:'book-b-'+revision,content:Buffer.from(bookBText).toString('base64')}});
            }
            assert.equal(route.request().method(),'PUT');
            const body=route.request().postDataJSON();assert.equal(body.sha,'book-b-'+revision);assert.equal(body.branch,'main');
            if(conflict)return route.fulfill({status:409,json:{message:'Simulated conflict'}});
            puts++;revision++;bookBText=Buffer.from(body.content,'base64').toString('utf8');
            return route.fulfill({status:200,json:{content:{sha:'book-b-'+revision}}});
        });
        await page.goto(url+'/editor/?book=book_b');await page.locator('#verify-open-btn:enabled').waitFor();
        assert.equal(await page.locator('#login-book-selector').inputValue(),'book_b');
        await page.locator('#admin-passcode-box').fill(password);await page.locator('#admin-token-box').fill('test-only-token');
        await page.locator('#verify-open-btn').click();await page.locator('#login-shield-gate').waitFor({state:'hidden'});
        await page.locator('#editor-record-status').filter({hasText:'Entry 1 of 1858'}).waitFor();
        assert(await page.locator('#publish-words-btn').isVisible());assert(await page.locator('#publish-words-btn').isEnabled());
        assert.equal(await page.locator('#publish-words-btn').evaluate(el=>el.previousElementSibling.id),'commit-save-btn');
        assert.equal(await page.locator('#edit-meaning-field').getAttribute('dir'),'rtl');
        assert.equal(await page.locator('#word-target-index').getAttribute('max'),'1844');
        await page.locator('#word-target-index').fill('25');await page.locator('#lookup-go-btn').click();
        const original25=parseLughatBook(bookBText).records.find(record=>record.number===25);
        assert.equal(await page.locator('#edit-meaning-field').inputValue(),original25.rawMeaning);
        const correction=original25.rawMeaning+' (تجربہ)';
        await page.locator('#edit-meaning-field').fill(correction);
        await page.locator('#publish-words-btn').click();
        await page.locator('#toast-alert').filter({hasText:'Save your corrections'}).waitFor();
        assert.equal(gets,0);assert.equal(puts,0);
        await page.locator('#commit-save-btn').click();
        await page.locator('#toast-alert').filter({hasText:'Word #25 saved to GitHub.'}).waitFor();
        assert.equal(puts,1);
        assert.equal(parseLughatBook(bookBText).records.find(record=>record.number===25).rawMeaning,correction);
        assert.equal(parseLughatBook(bookBText).records.filter(record=>record.verified).length,20);
        await page.locator('#publish-words-btn').click();
        await page.locator('#editor-availability-status').filter({hasText:'after word 25'}).waitFor();
        assert.equal(puts,2);assert.equal(parseLughatBook(bookBText).records.filter(record=>record.verified).length,25);
        await page.locator('#publish-words-btn').click();
        await page.locator('#toast-alert').filter({hasText:'already available'}).waitFor();assert.equal(puts,2);
        await page.locator('#word-target-index').fill('20');await page.locator('#lookup-go-btn').click();
        await page.locator('#publish-words-btn').click();
        await page.locator('#toast-alert').filter({hasText:'already available'}).waitFor();assert.equal(puts,2);
        // A newer server-side boundary must win over this browser's earlier state.
        const remoteLines=bookBText.split(/\r\n|\n|\r/).filter(line=>line.trim()!=='-----');
        remoteLines.splice(remoteLines.findIndex(line=>line.startsWith('0035 '))+1,0,'-----');bookBText=remoteLines.join('\n');revision++;
        await page.locator('#word-target-index').fill('30');await page.locator('#lookup-go-btn').click();
        await page.locator('#publish-words-btn').click();
        await page.locator('#editor-availability-status').filter({hasText:'after word 35'}).waitFor();assert.equal(puts,2);
        await page.locator('#word-target-index').fill('40');await page.locator('#lookup-go-btn').click();
        conflict=true;await page.locator('#publish-words-btn').click();
        await page.locator('#toast-alert').filter({hasText:'changed while saving'}).waitFor();
        assert.equal(puts,2);assert.equal(parseLughatBook(bookBText).records.filter(record=>record.verified).length,35);
        conflict=false;await page.locator('#publish-words-btn').click();
        await page.locator('#editor-availability-status').filter({hasText:'after word 40'}).waitFor();assert.equal(puts,3);
        await page.locator('#toast-alert.show').waitFor({state:'hidden'});
        await page.locator('#publish-words-btn').scrollIntoViewIfNeeded();
        await page.screenshot({path:'artifacts/editor-book-b-'+viewport.width+'.png',fullPage:true});
        await page.locator('#word-target-index').fill('1844');await page.locator('#lookup-go-btn').click();
        await page.locator('#editor-record-status').filter({hasText:'Entry 1858 of 1858'}).waitFor();
        assert.equal(await page.locator('#edit-arabic-field').inputValue(),parseLughatBook(bookBText).records.at(-1).word);
        assert(await page.locator('#commit-save-btn').isEnabled());
        assert.deepEqual(errors,[]);
        await context.close();page=null;
    }
    console.log('PASS: Editor desktop/mobile Book B entries, source-preserving saves, marker advancement/no-op/conflicts, original styling and availability button under Save. Remaining original-input glyph differences logged separately. GitHub writes mocked.');
} catch(error) {
    console.error('Editor browser diagnostics:',JSON.stringify({pageErrors,url:page?.url(),loginError:await page?.locator('#login-error').textContent().catch(()=>null)}));
    if(page)await page.screenshot({path:'artifacts/editor-failure.png',fullPage:true}).catch(()=>{});
    throw error;
} finally {if(browser)await browser.close();server.kill();}
