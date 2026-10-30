import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import {withVerificationAt} from './book-b-fixture.mjs';
import { encodeQuizCode, decodeTeacherQuizCode } from '../shared/quiz-codes.js?v=1029.26-strawberry7';
import { parseVocabularyRecords, rootFileUrl, loadBook } from '../shared/vocabulary.js?v=1029.26-strawberry7';
import { replaceVocabularyRecord, saveVocabularyRecord, repositoryVocabularyPath } from '../editor/js/github.js?v=1029.26-editor8';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const vocabularyText = read('Vocabulary-File.txt');
const records = parseVocabularyRecords(vocabularyText);
const nativeFetch = globalThis.fetch;

// Small DOM harness for behavior checks without a browser or third-party packages.
class Element {
    constructor(tag = 'div') {
        this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {};
        this.style = { setProperty(name, value) { this[name] = value; } };
        this.attributes = {}; this.events = {}; this.className = ''; this.value = ''; this.disabled = false;
        this.textContent = ''; this.clientHeight = 400; this.offsetTop = 0; this.scrollTop = 0;
        this.classList = {
            contains: name => this.className.split(/\s+/).includes(name),
            add: name => { if (!this.classList.contains(name)) this.className += ' ' + name; },
            remove: name => { this.className = this.className.split(/\s+/).filter(value => value !== name).join(' '); },
            toggle: (name, force) => { const active = force ?? !this.classList.contains(name); this.classList[active ? 'add' : 'remove'](name); return active; }
        };
    }
    appendChild(child) { if (child.tagName === 'FRAGMENT') this.append(...child.children); else { child.parent = this; this.children.push(child); } return child; }
    append(...children) { children.forEach(child => this.appendChild(child)); }
    replaceChildren(...children) { this.children = []; this.append(...children); }
    set innerHTML(value) { this.children = []; this.textContent = value; }
    get innerHTML() { return this.textContent; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    addEventListener(event, handler) { (this.events[event] ??= []).push(handler); }
    focus() { this.focused = true; }
    blur() { this.focused = false; }
    select() { this.selected = true; }
    contains(element) { return element === this || this.children.some(child => child.contains(element)); }
    querySelectorAll(selector) {
        const match = element => selector.startsWith('.') ? element.classList.contains(selector.slice(1)) : element.tagName === selector.toUpperCase();
        return this.children.flatMap(child => [...(match(child) ? [child] : []), ...child.querySelectorAll(selector)]);
    }
    getElementsByTagName(tag) { return this.querySelectorAll(tag); }
    createTHead() { return this.appendChild(new Element('thead')); }
    createTBody() { return this.appendChild(new Element('tbody')); }
    insertRow() { return this.appendChild(new Element('tr')); }
    insertCell() { return this.appendChild(new Element('td')); }
    getBoundingClientRect() { return { top: this.offsetTop - (this.parent?.scrollTop || 0), height: 64 }; }
    scrollTo({ top }) { this.scrollTop = top; }
}
let elements;
let timers = new Map();
let timerNumber = 0;
const nativeTimeout = globalThis.setTimeout;
const nativeClearTimeout = globalThis.clearTimeout;
function dom(file) {
    elements = new Map(); timers.clear();
    const actionElements = [];
    for (const match of read(file).matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)) {
        const element = new Element(match[1]);
        const attributes = Object.fromEntries([...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(value => [value[1], value[2]]));
        Object.assign(element, { className: attributes.class || '', value: attributes.value || '' });
        element.disabled = /\sdisabled(?:\s|=|$)/.test(match[2]);
        for (const [key,value] of Object.entries(attributes)) if (key.startsWith('data-')) element.dataset[key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
        if (attributes.id) elements.set(attributes.id,element);
        if (element.dataset.action) actionElements.push(element);
    }
    globalThis.document = {
        getElementById: id => { assert(elements.has(id), 'Missing DOM id: ' + id); return elements.get(id); },
        createElement: tag => new Element(tag), createDocumentFragment: () => new Element('fragment'),
        querySelectorAll: selector => {
            if (selector === '[data-action]') return actionElements;
            const [id, child] = selector.split(' ');
            return elements.get(id.slice(1))?.querySelectorAll(child) || [];
        }
    };
    globalThis.window = { innerWidth: 1000, confirm: () => true, addEventListener() {} };
    globalThis.setTimeout = (callback, delay) => { const id = ++timerNumber; timers.set(id, {callback,delay}); return id; };
    globalThis.clearTimeout = id => timers.delete(id);
    globalThis.requestAnimationFrame = callback => globalThis.setTimeout(callback, 16);
}
const el = id => document.getElementById(id);
function runTimer(id) { const timer = timers.get(id); assert(timer); timers.delete(id); timer.callback(); }
function runDelay(delay) { for (const [id, timer] of [...timers]) if (timer.delay === delay) runTimer(id); }

test('shared data, teacher selection, student sessions and Editor saves', async t => {
    await t.test('10/20 codes round-trip, old codes match, invalid inputs rejected', () => {
        for (const count of [10, 20]) {
            for (let trial = 0; trial < 60; trial++) {
                const numbers = Array.from({length:count}, (_, index) => index + 1 + trial);
                const oldEncoding = BigInt(numbers.map(value => String(value).padStart(3,'0')).join('')).toString(16).toUpperCase();
                assert.equal(encodeQuizCode([...numbers].reverse()), oldEncoding);
                assert.deepEqual(decodeTeacherQuizCode(oldEncoding),numbers);
                assert.deepEqual(decodeTeacherQuizCode(oldEncoding.toLowerCase()),numbers);
            }
        }
        assert.deepEqual(decodeTeacherQuizCode(encodeQuizCode(Array.from({length:20}, (_, index) => 980 + index))), Array.from({length:20}, (_, index) => 980 + index));
        for (const code of ['', 'xyz', '0', 'F'.repeat(51), '0xABC']) assert.equal(decodeTeacherQuizCode(code), null);
        assert.throws(() => encodeQuizCode(Array(20).fill(1)));
        assert.throws(() => encodeQuizCode(Array.from({length:19}, (_, index) => index+1)));
        assert.throws(() => encodeQuizCode([1000, ...Array.from({length:19}, (_, index) => index+1)]));
    });

    await t.test('shared parser preserves book order, duplicates, Unicode, separators and root paths', async () => {
        assert(records.length >= 61, "Book A needs at least 61 words for cross-page selection coverage");
        assert.deepEqual(parseVocabularyRecords('one = a=b\r\ninvalid\r\n = empty\nاثنان = two\none = repeated'), [
            {word:'one',meaning:'a=b'}, {word:'اثنان',meaning:'two'}, {word:'one',meaning:'repeated'}
        ]);
        const requested = [];
        globalThis.fetch = async (url, options) => { requested.push([url, options]); return {ok:true, text:async()=>vocabularyText}; };
        assert.deepEqual(await loadBook('book_a'), records);
        assert.equal(new URL(requested[0][0]).href, rootFileUrl('Vocabulary-File.txt').href);
        assert.equal(requested[0][1].cache, 'no-store');
        await assert.rejects(loadBook('missing'));
        assert.equal(repositoryVocabularyPath('Vocabulary-File.txt','https://hassanme2050.github.io/Quran-Arabic-Quiz/TEST/editor/js/github.js'), 'TEST/Vocabulary-File.txt');
        assert.equal(repositoryVocabularyPath('Vocabulary-File.txt','https://hassanme2050.github.io/Quran-Arabic-Quiz/editor/js/github.js'), 'Vocabulary-File.txt');
        assert.equal(repositoryVocabularyPath('Vocabulary-File.txt','http://127.0.0.1:8124/editor/js/github.js'), 'Vocabulary-File.txt');
        assert.equal(new URL('../Vocabulary-File.txt','https://hassanme2050.github.io/Quran-Arabic-Quiz/TEST/shared/vocabulary.js').pathname, '/Quran-Arabic-Quiz/TEST/Vocabulary-File.txt');
        assert.equal(new URL('../CP.txt','https://hassanme2050.github.io/Quran-Arabic-Quiz/TEST/shared/vocabulary.js').pathname, '/Quran-Arabic-Quiz/TEST/CP.txt');
    });

    await t.test('Generator selection spans pages, updates one tile, stops at 20 and invalidates stale codes', async () => {
        dom('test-generator/index.html');
        await import('../test-generator/js/app.js?v=1029.26-strawberry7');
        const {state} = await import('../test-generator/js/state.js?v=1029.26-strawberry7');
        const {renderInventoryTilesGrid,changeMatrixActivePage} = await import('../test-generator/js/grid.js?v=1029.26-strawberry7');
        const {toggleWordSelection,processSelectedHexadecimalQuizCode} = await import('../test-generator/js/selection.js?v=1029.26-strawberry7');
        state.fullVocabularyInventory = records;
        renderInventoryTilesGrid();
        assert.equal(state.totalCardsPerPageLimit,50);
        assert.equal(el('tiles-matrix-box').children.length,50);
        const firstTile = el('tiles-matrix-box').children[0];
        for (let number=1; number<=10; number++) toggleWordSelection(number,el('tiles-matrix-box').children[number-1]);
        assert.equal(el('tiles-matrix-box').children[0],firstTile);
        assert(el('generate-code-btn').disabled);
        changeMatrixActivePage('1');
        assert.equal(el('tiles-matrix-box').children.length,Math.min(50, records.length - 50));
        assert.equal(el('tiles-matrix-box').children[0].dataset.number,'51');
        for (let number=51; number<=60; number++) toggleWordSelection(number,el('tiles-matrix-box').children[number-51]);
        assert.equal(state.selected.size,20);
        assert(!el('generate-code-btn').disabled);
        toggleWordSelection(61,el('tiles-matrix-box').children[10]);
        assert.equal(state.selected.size,20);
        processSelectedHexadecimalQuizCode();
        assert.deepEqual(decodeTeacherQuizCode(el('quiz-code-output').value), [...state.selected].sort((a,b)=>a-b));
        assert(!el('copy-code-btn').disabled);
        changeMatrixActivePage('-1');
        assert(el('tiles-matrix-box').children[0].classList.contains('selected-state'));
        toggleWordSelection(1,el('tiles-matrix-box').children[0]);
        assert(el('generate-code-btn').disabled);
        assert(el('copy-code-btn').disabled);
        assert.equal(el('quiz-code-output').value,'');
    });

    await t.test('Generator login keeps failed loads visible and resets selection after a successful load', async () => {
        dom('test-generator/index.html');
        const {state} = await import('../test-generator/js/state.js?v=1029.26-strawberry7');
        const {evaluateTeacherCredentials} = await import('../test-generator/js/auth.js?v=1029.26-strawberry7');
        el('login-book-selector').value='book_a';
        el('admin-passcode-box').value='test-only-password';
        globalThis.fetch = async url => String(url).endsWith('CP.txt')
            ? {ok:true,text:async()=>Buffer.from('test-only-password').toString('base64')}
            : {ok:false,status:404};
        const oldError = console.error;
        console.error = () => {};
        try { await evaluateTeacherCredentials(); } finally { console.error=oldError; }
        runDelay(300);
        assert(!el('login-shield-gate').classList.contains('is-hidden'));
        assert(!el('verify-open-btn').disabled);
        state.selected.add(1);
        globalThis.fetch = async url => ({ok:true,text:async()=>String(url).endsWith('CP.txt') ? Buffer.from('test-only-password').toString('base64') : vocabularyText});
        await evaluateTeacherCredentials();
        runDelay(300);
        assert(el('login-shield-gate').classList.contains('is-hidden'));
        assert.equal(state.selected.size,0);
        assert.equal(state.fullVocabularyInventory.length,records.length);
        assert(el('generate-code-btn').disabled);
    });

    await t.test('student runs complete 20- and legacy 10-question quizzes and cancels pending answers on exit', async () => {
        dom('index.html');
        const vocabulary = await import('../js/vocabulary.js?v=1029.26-strawberry7');
        const quiz = await import('../js/quiz.js?v=1029.26-strawberry7');
        const {state} = await import('../js/state.js?v=1029.26-strawberry7');
        const {exitToHome} = await import('../js/ui.js?v=1029.26-strawberry7');
        vocabulary.parseVocabulary(vocabularyText);
        const beginCodeQuiz=()=>{
            quiz.startQuizWithCode();
            assert(!el('quiz-participant-view').classList.contains('hidden'));
            el('participant-name').value='Test participant';quiz.startParticipantQuiz();
            assert(!el('quiz-countdown-view').classList.contains('hidden'));
            for(let step=0;step<3;step++)runDelay(1000);
            assert(!el('quiz-view').classList.contains('hidden'));
        };
        for (const count of [20,10]) {
            el('quiz-code-field').value = encodeQuizCode(Array.from({length:count},(_,index)=>index+1));
            beginCodeQuiz();
            assert.equal(state.sessionWords.length,count);
            for(let index=0; index<count; index++) {
                assert.equal(el('quiz-counter').textContent, 'Question '+(index+1)+' of '+count);
                const item = state.sessionWords[index];
                const button = el('quiz-options-box').children.find(button=>button.textContent===item.meaning);
                assert(button); button.onclick(); runTimer(state.answerTimer);
            }
            assert.equal(el('score-text-value').textContent,count+'/'+count);
            assert.equal(el('percent-text-value').textContent,'100%');
            assert.equal(el('summary-table-container').children[0].children[1].children.length,count);
        }
        el('quiz-code-field').value = encodeQuizCode(Array.from({length:20},(_,index)=>index+1));
        beginCodeQuiz();
        el('quiz-options-box').children[0].onclick();
        const pending = state.answerTimer;
        exitToHome();
        assert(!timers.has(pending));
        assert.equal(state.answerTimer,null);
        assert(!el('menu-view').classList.contains('hidden'));
        el('quiz-code-field').value = encodeQuizCode(Array.from({length:20},(_,index)=>900+index));
        quiz.startQuizWithCode();
        assert(!el('quiz-code-error').classList.contains('hidden'));
    });

    await t.test('dictionary sorting never changes book order and reuses unchanged rows', async () => {
        dom('index.html');
        const vocabulary = await import('../js/vocabulary.js?v=1029.26-strawberry7');
        const dictionary = await import('../js/dictionary.js?v=1029.26-strawberry7');
        vocabulary.parseVocabulary(vocabularyText);
        const original = structuredClone(vocabulary.vocabularyList);
        dictionary.openDictionaryMode();
        assert.equal(el('dictionary-list').querySelectorAll('.dictionary-entry').length,records.length);
        const first = el('dictionary-list').children[0];
        dictionary.renderDictionary();
        assert.equal(el('dictionary-list').children[0],first);
        for(const mode of ['number','english','arabic']) {
            dictionary.setDictionarySort(mode);
            assert.equal(Number(el('dictionary-jump').style['--dictionary-jump-count']), el('dictionary-jump').querySelectorAll('button').length);
        }
        assert.deepEqual(vocabulary.vocabularyList,original);
    });

    await t.test('Editor rejects missing credentials and passwords absent from CP.txt', async () => {
        dom('editor/index.html');
        el('verify-open-btn').disabled=false;
        const {evaluateAdministrativeCredentials} = await import('../editor/js/auth.js?v=1029.26-editor8');
        const {state} = await import('../editor/js/state.js?v=1029.26-editor8');
        state.token='';
        const requests=[];
        globalThis.fetch = async (url,options) => {
            requests.push({url:String(url),options});
            return {ok:true,text:async()=>Buffer.from('test-only-configured-password').toString('base64')};
        };
        el('login-book-selector').value='book_a';
        await evaluateAdministrativeCredentials();
        assert.match(el('login-error').textContent,/system password/);
        el('admin-passcode-box').value='wrong-test-password';
        await evaluateAdministrativeCredentials();
        assert.match(el('login-error').textContent,/GitHub token/);
        assert.equal(requests.length,0);
        el('admin-token-box').value='test-only-token';
        await evaluateAdministrativeCredentials();
        assert.match(el('login-error').textContent,/Invalid password/);
        assert.equal(el('admin-passcode-box').value,'');
        assert(el('admin-passcode-box').focused);
        assert.equal(state.token,'');
        assert.equal(requests.length,1);
        assert(requests[0].url.endsWith('/CP.txt'));
        assert.equal(requests[0].options.cache,'no-store');
        assert(!requests[0].options.headers,'password verification must not transmit the GitHub token');
        assert.notEqual(el('login-shield-gate').style.opacity,'0');
        assert(!el('verify-open-btn').disabled);
    });

    await t.test('Editor uses current UTF-8 passwords from CP.txt and blocks duplicate submissions', async () => {
        dom('editor/index.html');
        el('verify-open-btn').disabled=false;
        const {evaluateAdministrativeCredentials} = await import('../editor/js/auth.js?v=1029.26-editor8');
        const {state} = await import('../editor/js/state.js?v=1029.26-editor8');
        const configured='test-only-\u0627\u0644\u0641';
        el('login-book-selector').value='book_a';
        el('admin-passcode-box').value=' '+configured+' ';
        el('admin-token-box').value=' test-only-token ';
        const requests=[];
        globalThis.fetch = async (url,options) => {
            requests.push({url:String(url),options});
            return {ok:true,text:async()=>String(url).endsWith('CP.txt')
                ? '\uFEFF'+Buffer.from('another-test-password').toString('base64')+'\r\n\r\n '+Buffer.from(configured).toString('base64')+' \r\n'
                : vocabularyText};
        };
        const first=evaluateAdministrativeCredentials();
        assert(el('verify-open-btn').disabled);
        await Promise.all([first,evaluateAdministrativeCredentials()]);
        assert.equal(requests.filter(r=>r.url.endsWith('CP.txt')).length,1);
        assert.equal(requests.filter(r=>r.url.endsWith('Vocabulary-File.txt')).length,1);
        assert.equal(state.token,'test-only-token');
        assert.equal(state.loadedNumber,1);
        assert.equal(el('admin-passcode-box').value,'');
        assert.equal(el('login-error').textContent,'');
        runDelay(300);
        assert(el('login-shield-gate').classList.contains('hidden'));
        assert(!el('verify-open-btn').disabled);
        assert(!el('edit-arabic-field').disabled);
    });

    await t.test('Editor stays gated after password-file or vocabulary failures and can retry', async () => {
        dom('editor/index.html');
        el('verify-open-btn').disabled=false;
        const {evaluateAdministrativeCredentials} = await import('../editor/js/auth.js?v=1029.26-editor8');
        const {state} = await import('../editor/js/state.js?v=1029.26-editor8');
        state.token='';
        el('login-book-selector').value='book_a';
        el('admin-passcode-box').value='test-only-password';
        el('admin-token-box').value='test-only-token';
        let mode='unavailable';
        globalThis.fetch = async url => ({
            ok:String(url).endsWith('CP.txt')?mode!=='unavailable':mode!=='vocabulary-failed',status:503,
            text:async()=>String(url).endsWith('CP.txt')?(mode==='empty'?'\r\n ':Buffer.from('test-only-password').toString('base64')):vocabularyText
        });
        for(const [failure,message] of [['unavailable',/Unable to verify/],['empty',/No passwords/],['vocabulary-failed',/Vocabulary file could not be loaded/]]) {
            mode=failure;
            await evaluateAdministrativeCredentials();
            assert.match(el('login-error').textContent,message);
            assert.equal(state.token,'');
            assert(!el('login-shield-gate').classList.contains('hidden'));
            assert(!el('verify-open-btn').disabled);
            assert(el('edit-arabic-field').disabled);
        }
        mode='success';
        await evaluateAdministrativeCredentials();runDelay(300);
        assert(el('login-shield-gate').classList.contains('hidden'));
        assert.equal(el('login-error').textContent,'');
        assert.equal(state.token,'test-only-token');
    });

    await t.test('Editor loads and navigates book numbers, rejects mismatched save target, and blocks conflicts', async () => {
        dom('editor/index.html');
        await import('../editor/js/app.js?v=1029.26-editor8');
        const {state} = await import('../editor/js/state.js?v=1029.26-editor8');
        const {initializeVocabularyDataStream} = await import('../editor/js/vocabulary.js?v=1029.26-editor8');
        const {navigateWord,loadTargetInventoryRecord} = await import('../editor/js/records.js?v=1029.26-editor8');
        const {saveWordUpdateToGitHub} = await import('../editor/js/save.js?v=1029.26-editor8');
        let requests = 0;
        globalThis.fetch = async () => { requests++; return {ok:true,text:async()=>vocabularyText}; };
        assert(await initializeVocabularyDataStream());
        assert.equal(state.loadedNumber,1);
        assert(!el('lookup-go-btn').disabled,'GO must be available as soon as the library is loaded');
        el('word-target-index').value=2;el('lookup-go-btn').events.click[0]();
        assert.equal(state.loadedNumber,2,'GO must load the typed book number');
        assert.equal(el('edit-arabic-field').value,records[1].word);
        el('word-target-index').value=1;el('lookup-go-btn').events.click[0]();
        navigateWord(1); assert.equal(state.loadedNumber,2);
        el('word-target-index').value=3;
        state.token='test-only';
        await saveWordUpdateToGitHub();
        assert.equal(requests,1,'Mismatched target must not write');
        loadTargetInventoryRecord(); assert.equal(state.loadedNumber,3);
        const original = state.records[2];
        const text = 'one = first\r\n# note\r\nاثنان = second\r\n';
        assert.equal(replaceVocabularyRecord(text,2,{word:'اثنان',meaning:'second'},{word:'اثنان',meaning:'updated'}), 'one = first\r\n# note\r\nاثنان = updated\r\n');
        assert.throws(()=>replaceVocabularyRecord(text,2,{word:'other',meaning:'second'},{word:'اثنان',meaning:'updated'}), /changed/);
        const calls = [];
        globalThis.fetch = async (url,options) => {
            calls.push({url,options});
            if(options.method==='PUT') return {ok:true};
            return {ok:true,json:async()=>({sha:'test-sha',content:Buffer.from(vocabularyText).toString('base64')})};
        };
        el('edit-meaning-field').value='test updated meaning';
        const saving=saveWordUpdateToGitHub();
        assert(el('lookup-go-btn').disabled,'GO must pause while a save is pending');
        await saving;
        assert.equal(calls.length,2);
        const payload = JSON.parse(calls[1].options.body);
        assert.equal(payload.branch,'main'); assert.equal(payload.sha,'test-sha');
        const saved = parseVocabularyRecords(Buffer.from(payload.content,'base64').toString('utf8'));
        assert.deepEqual(saved[2],{word:original.word,meaning:'test updated meaning'});
        assert.deepEqual(saved.filter((_,index)=>index!==2),records.filter((_,index)=>index!==2));
        assert(!state.saving); assert(!el('commit-save-btn').disabled);
        assert(!el('lookup-go-btn').disabled,'GO must be restored after saving');
        calls.length=0;
        await assert.rejects(saveVocabularyRecord({filename:'Vocabulary-File.txt',token:'test-only',number:3,expected:{word:'changed',meaning:'x'},updated:original}), /changed/);
        assert.equal(calls.length,1,'Conflict must not issue PUT');
    });

    await t.test('Book B Editor loads all entries, including unverified and repeated source numbers', async () => {
        dom('editor/index.html');
        const {state}=await import('../editor/js/state.js?v=1029.26-editor8');
        const {initializeVocabularyDataStream}=await import('../editor/js/vocabulary.js?v=1029.26-editor8');
        const {navigateWord,loadTargetInventoryRecord}=await import('../editor/js/records.js?v=1029.26-editor8');
        const text=withVerificationAt(read('Lughat-AlQuran-word-meaning.txt'),20);
        state.activeBook='book_b';state.activeFile='Lughat-AlQuran-word-meaning.txt';
        globalThis.fetch=async()=>({ok:true,text:async()=>text});
        assert(await initializeVocabularyDataStream());
        assert.equal(state.records.length,1858);assert.equal(state.availableThrough,20);
        assert.equal(el('word-target-index').max,1844);
        assert.equal(el('meaning-field-label').textContent,'Urdu Meaning / Notes');
        assert.equal(el('edit-meaning-field').dir,'rtl');
        assert(!el('editor-availability').classList.contains('hidden'));
        for(let i=0;i<state.records.length;i++) {
            if(i)navigateWord(1);
            assert.equal(state.loadedIndex,i);
            assert.equal(state.loadedNumber,state.records[i].number);
            assert.equal(el('edit-meaning-field').value,state.records[i].rawMeaning);
            if(state.records[i].occurrence>1)assert.match(el('editor-record-status').textContent,/occurrence/);
        }
        navigateWord(1);assert.equal(state.loadedIndex,1857);
        el('word-target-index').value=100;loadTargetInventoryRecord();
        assert.equal(state.loadedNumber,100);assert.equal(state.records[state.loadedIndex].verified,false);
        assert(!el('commit-save-btn').disabled);assert(!el('publish-words-btn').disabled);
    });

    await t.test('all pages and local module imports resolve; legacy links redirect', () => {
        function walk(directory) { return fs.readdirSync(directory,{withFileTypes:true}).flatMap(item=>item.isDirectory()?walk(path.join(directory,item.name)):[path.join(directory,item.name)]); }
        for(const file of walk(root).filter(file=>file.endsWith('.js'))) {
            const source = fs.readFileSync(file,'utf8');
            for(const match of source.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) assert(fs.existsSync(path.resolve(path.dirname(file),match[1].split('?')[0])),file+' imports missing '+match[1]);
        }
        for(const file of ['index.html','editor/index.html','test-generator/index.html']) {
            const source=read(file);
            assert(!/\son(?:click|change)=/.test(source));
            for(const match of source.matchAll(/(?:href|src)="([^":]+\.(?:js|css)(?:\?[^\"]*)?)"/g)) assert(fs.existsSync(path.resolve(root,path.dirname(file),match[1].split('?')[0])));
        }
        assert(read('Editor.html').includes('url=editor/index.html'));
        assert(read('Test-Generator.html').includes('url=test-generator/index.html'));
    });

    await t.test('Book B sessions exclude unverified words, dictionary keeps them, and codes enforce book identity', async () => {
        dom('index.html');
        const vocabulary = await import('../js/vocabulary.js?v=1029.26-strawberry7');
        const quiz = await import('../js/quiz.js?v=1029.26-strawberry7');
        const dictionary = await import('../js/dictionary.js?v=1029.26-strawberry7');
        const cards = await import('../js/flashcards.js?v=1029.26-strawberry7');
        const {state} = await import('../js/state.js?v=1029.26-strawberry7');
        const headings = read('Lughat-AlQuran-word-meaning.txt').split(/\r?\n/).slice(0,2).join('\n');
        const rows = Array.from({length:30},(_,i)=>String(i+1).padStart(4,'0')+' word'+(i+1)+' \u27F5 meaning'+(i+1)+' (note)');
        const text = headings+'\n'+rows.slice(0,20).join('\n')+'\n-----\n'+rows.slice(20).join('\n');
        vocabulary.parseVocabulary(text,'book_b');
        assert.equal(vocabulary.vocabularyList.length,20);
        assert.equal(vocabulary.dictionaryVocabularyList.length,30);
        assert.equal(el('dict-sort-english').textContent,'Urdu');
        for(const item of vocabulary.vocabularyList) assert(quiz.generateQuizChoices(item).every(choice=>choice.verified!==false));
        el('quiz-code-field').value=encodeQuizCode(Array.from({length:10},(_,i)=>i+1));
        quiz.startQuizWithCode(); assert(!el('quiz-code-error').classList.contains('hidden'));
        el('quiz-code-field').value=encodeQuizCode(Array.from({length:10},(_,i)=>i+1),'book_b');
        quiz.startQuizWithCode(); assert.equal(state.sessionWords.length,10); assert(state.sessionWords.every(item=>item.verified));
        cards.showCard(); assert.equal(el('card-meaning-field').dir,'rtl'); assert(el('card-meaning-field').textContent.includes('(note)'));
        dictionary.openDictionaryMode(); dictionary.setDictionarySort('number');
        assert.equal(el('dictionary-list').querySelectorAll('.dictionary-entry').length,30);
        assert.equal(el('dictionary-list').querySelectorAll('.unverified').length,10);
        el('quiz-code-field').value=encodeQuizCode(Array.from({length:10},(_,i)=>i+15),'book_b');
        quiz.startQuizWithCode(); assert(!el('quiz-code-error').classList.contains('hidden'));
        vocabulary.parseVocabulary(headings+'\n'+rows.join('\n'),'book_b');
        assert.equal(vocabulary.vocabularyList.length,0); assert.equal(vocabulary.dictionaryVocabularyList.length,30);
        dictionary.openDictionaryMode(); assert.equal(el('dictionary-list').querySelectorAll('.unverified').length,30);
        vocabulary.parseVocabulary(vocabularyText);
        dictionary.openDictionaryMode(); assert.equal(el('dictionary-list').querySelectorAll('.dictionary-entry').length,records.length);
        assert.equal(el('dict-sort-english').textContent,'English');
    });

    await t.test('HTTP preview serves all tool pages, shared assets and clean subfolder URLs', async () => {
        // Node's HTTP client needs real timer handles, including unref().
        globalThis.setTimeout = nativeTimeout;
        globalThis.clearTimeout = nativeClearTimeout;
        const child = spawn(process.execPath,[path.join(root,'serve.cjs')], {env:{...process.env,PORT:'0'},windowsHide:true,stdio:['ignore','pipe','pipe']});
        let address;
        try {
            address = await new Promise((resolve,reject) => {
                const timeout = nativeTimeout(()=>reject(new Error('Preview startup timed out')),5000);
                child.once('error',reject);
                child.stdout.on('data',buffer=>{
                    const match = String(buffer).match(/http:\/\/127\.0\.0\.1:\d+/);
                    if(match) { nativeClearTimeout(timeout); resolve(match[0]); }
                });
                child.once('exit',code=>{ nativeClearTimeout(timeout); reject(new Error('Preview exited: '+code)); });
            });
            for(const route of ['/','/editor/','/test-generator/','/Editor.html','/Test-Generator.html','/shared/vocabulary.js','/shared/quiz-codes.js','/Vocabulary-File.txt']) {
                const response = await nativeFetch(address+route);
                assert.equal(response.status,200,route);
                assert.equal(response.headers.get('cache-control'),'no-store');
            }
            assert.equal((await nativeFetch(address+'/shared/quiz-codes.js')).headers.get('content-type'),'text/javascript; charset=utf-8');
            assert.equal((await nativeFetch(address+'/does-not-exist')).status,404);
        } finally { child.kill(); }
    });
}).finally(() => {
    globalThis.setTimeout=nativeTimeout;
    globalThis.clearTimeout=nativeClearTimeout;
    globalThis.fetch=nativeFetch;
});
