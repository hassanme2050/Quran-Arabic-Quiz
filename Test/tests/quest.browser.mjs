import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {text} from 'node:stream/consumers';
import {parseVocabularyRecords} from '../shared/vocabulary.js?v=1029.26-strawberry1';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url));
const qa=process.env.QUEST_QA_DIR||path.join(os.tmpdir(),'strawberry-qa');
fs.mkdirSync(qa,{recursive:true});
const vocabulary=parseVocabularyRecords(fs.readFileSync(path.join(root,'Vocabulary-File.txt'),'utf8'));
const server=spawn(process.execPath,[path.join(root,'serve.cjs')],{env:{...process.env,PORT:'0'},stdio:['ignore','pipe','pipe'],windowsHide:true});
let browser,page;
const errors=[];
try {
    const url=await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(Error('Preview startup timed out')),10000);
        server.on('error',reject);
        server.stdout.on('data',buffer=>{const match=String(buffer).match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});
        server.on('exit',code=>reject(Error('Preview exited '+code)));
    });
    browser=await chromium.launch({headless:true});
    const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
    page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    await page.clock.install({time:new Date('2026-10-25T10:00:00Z')});
    await page.goto(url);await page.locator('#menu-view:not(.hidden)').waitFor();
    await page.locator('[data-action="openQuest"]').click();
    await page.locator('#quest-map-view:not(.hidden)').waitFor();
    await page.clock.pauseAt(new Date('2026-10-25T12:00:00Z'));
    assert.equal(await page.locator('.quest-node').count(),10);
    assert(await page.locator('[data-node="stage-2"]').isDisabled());
    assert.equal(await page.locator('.quest-hero,.quest-map-key,.quest-rules').count(),0);
    assert(await page.locator('#quest-map-scroll').evaluate(el=>el.scrollWidth>el.clientWidth));
    const points=await page.locator('.quest-stop').evaluateAll(nodes=>nodes.map(n=>n.offsetLeft));
    assert(points.every((x,i)=>!i||x>points[i-1]),'stages must run left to right');
    assert(await page.locator('#quest-progress').evaluate(el=>el.getBoundingClientRect().bottom<document.querySelector('.quest-backup-actions').getBoundingClientRect().top));
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:path.join(qa,'desktop-map.jpg'),fullPage:true,type:'jpeg',quality:75});
    async function visible(id){await page.locator('#'+id+':not(.hidden)').waitFor();}
    async function review(stage,resume=false) {
        const first=(stage-1)*10+1,total=Math.min(10,vocabulary.length-first+1);
        await visible('quest-review-view');
        for(let i=0;i<total;i++){
            assert.equal(await page.locator('#quest-review-number').textContent(),'Book word #'+(first+i));
            assert.equal(await page.locator('#quest-review-meaning').textContent(),vocabulary[first+i-1].meaning);
            if(stage===1&&i===0)await page.screenshot({path:path.join(qa,'review.jpg'),fullPage:true,type:'jpeg',quality:75});
            if(resume&&i===3){
                await page.reload();await page.locator('#menu-view:not(.hidden)').waitFor();
                await page.locator('[data-action="openQuest"]').click();await page.locator('#quest-continue').click();
                assert.equal(await page.locator('#quest-review-number').textContent(),'Book word #'+(first+i));
            }
            await page.locator('#quest-review-next').click();
        }
        await visible('quest-quiz-view');
    }
    async function answerQuiz(correctCount,total,resume=false) {
        const asked=[];
        for(let i=0;i<total;i++){
            assert.equal(await page.locator('#quest-question-counter').textContent(),'Question '+(i+1)+' of '+total);
            const number=Number((await page.locator('#quest-question-number').textContent()).match(/\d+/)[0]);
            asked.push(number);
            const labels=await page.locator('#quest-answer-options button').allTextContents();
            const meaning=vocabulary[number-1].meaning;
            const index=labels.findIndex(label=>i<correctCount?label===meaning:label!==meaning);
            assert(index>=0);await page.locator('#quest-answer-options button').nth(index).click();
            if(resume&&i===0){
                await page.reload();await page.locator('#menu-view:not(.hidden)').waitFor();
                await page.locator('[data-action="openQuest"]').click();await page.locator('#quest-continue').click();
            } else {
                assert(await page.locator('#quest-answer-options button').first().isDisabled());
                if(i===0){
                    await page.clock.fastForward(1199);
                    assert.equal(await page.locator('#quest-question-counter').textContent(),'Question '+(i+1)+' of '+total);
                    await page.clock.fastForward(1);
                } else await page.clock.fastForward(1200);
            }
        }
        await visible('quest-result-view');return asked;
    }
    await page.locator('[data-node="stage-1"]').click();await review(1,true);
    const firstAsked=await answerQuiz(5,10);
    assert.deepEqual([...firstAsked].sort((a,b)=>a-b),[1,2,3,4,5,6,7,8,9,10]);
    assert.equal(await page.locator('#quest-result-stars').getAttribute('aria-label'),'0 of 3 stars earned');
    assert(await page.locator('#quest-result-continue').isHidden());
    await page.locator('#quest-result-retry').click();await review(1);await answerQuiz(6,10);
    assert.equal(await page.locator('#quest-result-stars').getAttribute('aria-label'),'1 of 3 stars earned');
    await page.locator('#quest-result-continue').click();await review(2);await answerQuiz(8,10,true);
    assert.equal(await page.locator('#quest-result-stars').getAttribute('aria-label'),'2 of 3 stars earned');
    for(const stage of [3,4,5]){
        await page.locator('#quest-result-continue').click();await review(stage);await answerQuiz(stage===3?10:6,10);
    }
    await page.locator('#quest-result-continue').click();await visible('quest-quiz-view');
    assert((await page.locator('#quest-quiz-title').textContent()).includes('dragon'));
    assert.equal(await page.locator('#quest-question-counter').textContent(),'Question 1 of 25');
    const dragon=await answerQuiz(15,25);
    assert.equal(new Set(dragon).size,25);assert(dragon.every(number=>number>=1&&number<=50));
    await page.locator('[data-quest-action="map"]').last().click();
    assert(await page.locator('[data-node="stage-6"]').isEnabled());
    await page.reload();await page.locator('#menu-view:not(.hidden)').waitFor();await page.locator('[data-action="openQuest"]').click();
    assert(await page.locator('[data-node="stage-6"]').isEnabled());
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));
    await page.locator('[data-quest-action="home"]').click();
    await page.locator('[data-action="openQuest"]').click();
    await page.waitForTimeout(50);
    const focus=await page.locator('[data-node="stage-6"]').evaluate(el=>{const r=el.getBoundingClientRect(),v=document.querySelector('#quest-map-scroll').getBoundingClientRect();return r.left>=v.left&&r.right<=v.right;});
    assert(focus,'current stage must be visible when reopening the map');
    await page.locator('.quest-trouble-panel summary').click();
    assert(await page.locator('#quest-weak-words .summary-table tbody tr').count()>0);
    await page.screenshot({path:path.join(qa,'mobile-map.jpg'),fullPage:true,type:'jpeg',quality:75});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
    await page.locator('[data-node="stage-6"]').click();await review(6);
    await page.screenshot({path:path.join(qa,'mobile-quiz.jpg'),fullPage:true,type:'jpeg',quality:75});
    await page.locator('#quest-answer-options button').first().click();
    await page.locator('#quest-quiz-view [data-quest-action="map"]').click();
    await page.clock.fastForward(1200);
    assert(await page.locator('#quest-map-view').isVisible());
    const downloadPromise=page.waitForEvent('download');await page.locator('#quest-export').click();
    const download=await downloadPromise,backup=await text(await download.createReadStream());
    const exported=JSON.parse(backup);
    assert.equal(exported.records['dragon-1'].bestStars,1);assert.equal(exported.runs['stage-6'].phase,'quiz');
    await page.evaluate(()=>localStorage.clear());await page.reload();
    await page.locator('#menu-view:not(.hidden)').waitFor();await page.locator('[data-action="openQuest"]').click();
    assert(await page.locator('[data-node="stage-6"]').isDisabled());
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#quest-import-file').setInputFiles({name:'Quest-Progress.json',mimeType:'application/json',buffer:Buffer.from(backup)});
    await page.waitForFunction(()=>!document.querySelector('[data-node="stage-6"]').disabled);
    assert(await page.locator('[data-node="stage-6"]').isEnabled());
    const blocked=await browser.newContext({viewport:{width:390,height:844}});
    await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));
    const blockedPage=await blocked.newPage();
    await blockedPage.goto(url);await blockedPage.locator('#menu-view:not(.hidden)').waitFor();
    await blockedPage.locator('[data-action="openQuest"]').click();
    assert((await blockedPage.locator('#quest-save-note').textContent()).includes('could not be read'));
    await blockedPage.locator('[data-node="stage-1"]').click();
    assert((await blockedPage.locator('#quest-review-view .quest-session-save').textContent()).includes('cannot be saved'));
    await blocked.close();assert.deepEqual(errors,[]);
    console.log('PASS: Chromium desktop/mobile flow, failure/retry, stars, 25-word dragon, resume, export/import, blocked storage, automatic 1200ms progression, feedback exit cancellation, no overflow or JavaScript errors.');
} catch(error) {
    if(page)await page.screenshot({path:path.join(qa,'failure.jpg'),fullPage:true,type:'jpeg',quality:75}).catch(()=>{});
    throw error;
} finally {if(browser)await browser.close();server.kill();}
