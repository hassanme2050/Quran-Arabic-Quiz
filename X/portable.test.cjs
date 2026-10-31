const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const defaultDashboard={schema:1,books:Object.fromEntries(['book_a','book_b','book_c','book_d'].map(id=>[id,{state:'enable',review:'enable',quiz:'enable',quest:'enable',dictionary:id==='book_c'?'disable':'enable',quizCode:id==='book_c'?'hide':'enable'}]))};
const fixtures=JSON.parse(fs.readFileSync(path.join(__dirname,'source/tests/fixtures/library.json'),'utf8'));
const prefix='https://raw.githubusercontent.com/hassanme2050/Quran-Arabic-Quiz/main/Test2/';
class Element{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.events={};this.style={setProperty(name,value){this[name]=value;}};this.className='';this.value='';this.disabled=false;this._text='';this.clientHeight=400;this.scrollTop=0;
  this.classList={contains:n=>this.className.split(/\s+/).includes(n),add:n=>{if(!this.classList.contains(n))this.className+=' '+n;},remove:n=>{this.className=this.className.split(/\s+/).filter(x=>x!==n).join(' ');},toggle:(n,force)=>{const flag=force??!this.classList.contains(n);this.classList[flag?'add':'remove'](n);return flag;}};
 }
 get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}set textContent(text){this._text=String(text);this.children=[];}
 set innerHTML(text){this.textContent=text;}get innerHTML(){return this.textContent;}
 appendChild(child){if(child.tagName==='FRAGMENT')this.append(...child.children);else{child.parentElement=this;this.children.push(child);}return child;}
 append(...children){children.forEach(c=>this.appendChild(c));}replaceChildren(...children){this.children=[];this._text='';this.append(...children);}
 setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k]??null;}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}async trigger(event,extra={}){for(const fn of this.events[event]||[])await fn({target:this,preventDefault(){},stopPropagation(){},...extra});if(event==='click'&&this.onclick)await this.onclick();}
 focus(){}blur(){}select(){}remove(){}
 querySelectorAll(tag){return this.children.flatMap(c=>[...(c.tagName===tag.toUpperCase()?[c]:[]),...c.querySelectorAll(tag)]);}
 getElementsByTagName(tag){return this.querySelectorAll(tag);}createTHead(){return this.appendChild(new Element('thead'));}createTBody(){return this.appendChild(new Element('tbody'));}insertRow(){return this.appendChild(new Element('tr'));}insertCell(){return this.appendChild(new Element('td'));}
 closest(selector){return (selector==='[data-number]'?this.dataset.number!=null:selector.startsWith('.')&&this.classList.contains(selector.slice(1)))?this:this.parentElement?.closest(selector)||null;}
 querySelector(selector){return this.children.find(child=>selector.startsWith('.')?child.classList.contains(selector.slice(1)):child.tagName===selector.toUpperCase())||null;}
 contains(element){return this===element||this.children.some(child=>child.contains(element));}
 getBoundingClientRect(){return {top:0,height:64,width:600,bottom:64};}scrollTo({top}){this.scrollTop=top;}
}
async function launch(filename,location,settings=defaultDashboard){
 const html=fs.readFileSync(path.join(__dirname,filename),'utf8');const script=html.match(/<script id="dates-app-bundle">([\s\S]*?)<\/script>/)[1];
 const markup=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');const elements=new Map(),all=[],timers=new Map(),requests=[],shas={},books={...fixtures,'dbs.json':JSON.stringify(settings)};let serial=0;
 for(const m of markup.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)){
  const el=new Element(m[1]),attrs=Object.fromEntries([...m[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(x=>[x[1],x[2]]));
  el.className=attrs.class||'';el.value=attrs.value||'';el.disabled=/\sdisabled(?:\s|=|$)/.test(m[2]);el.attributes=attrs;
  for(const[k,v]of Object.entries(attrs))if(k.startsWith('data-'))el.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;
  if(attrs.id){el.id=attrs.id;elements.set(attrs.id,el);}all.push(el);
 }
 for(const id of ['vocabulary-book-selector','quest-book-selector'])if(elements.has(id))for(const book of ['book_a','book_b','book_c','book_d']){const option=new Element('option');option.value=book;elements.get(id).appendChild(option);}
 for(const id of ['vocabulary-book-selector','login-book-selector'])if(elements.has(id))elements.get(id).value='book_a';
 if(elements.has('quest-map-nodes'))elements.get('quest-map-nodes').parentElement=new Element('div');
 const document={getElementById:id=>{assert(elements.has(id),'Missing element '+id);return elements.get(id);},createElement:tag=>new Element(tag),createDocumentFragment:()=>new Element('fragment'),querySelectorAll:selector=>selector==='[data-action]'?all.filter(e=>e.dataset.action):selector==='[data-quest-action]'?all.filter(e=>e.dataset.questAction):selector==='.quest-session-save'?all.filter(e=>e.classList.contains('quest-session-save')):[],head:new Element('head'),body:new Element('body'),fonts:{ready:Promise.resolve()}};
 const env={console,document,URL,URLSearchParams,Date,performance,AbortController,DOMException,TextEncoder,TextDecoder,Blob,Map,Set,btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),location:new URL(location),navigator:{},innerWidth:1000,confirm:()=>true,addEventListener(){},html2canvas(){},setTimeout(fn,delay){const n=++serial;timers.set(n,{fn,delay});return n;},clearTimeout:n=>timers.delete(n),requestAnimationFrame:fn=>env.setTimeout(fn,16)};
 const storage=new Map();env.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};env.window=env;
 env.fetch=async(url,options={})=>{
  const target=String(url);requests.push({url:target,options});
  if(target.startsWith(prefix)){
   assert.equal(options.cache,'no-store');const name=decodeURIComponent(new URL(target).pathname.split('/').at(-1));if(env.failFile===name)throw Error('Network unavailable');
   return {ok:true,status:200,text:async()=>name==='CP.txt'?Buffer.from('test-only').toString('base64'):books[name]};
  }
  if(target.startsWith('https://api.github.com/')){
   assert(target.startsWith('https://api.github.com/repos/hassanme2050/Quran-Arabic-Quiz/contents/Test2/'));if(options.headers?.Authorization)assert.equal(options.headers.Authorization,'Bearer test-only-token');else assert(target.includes('/dbs.json'));
   const name=decodeURIComponent(new URL(target).pathname.split('/').at(-1));
   if(env.failSave&&options.method==='PUT')return {ok:false,status:403};
   if(options.method==='PUT'){const body=JSON.parse(options.body);assert.equal(body.sha,shas[name]||'current-sha');books[name]=Buffer.from(body.content,'base64').toString('utf8');shas[name]='saved-'+(Number((shas[name]||'').split('-')[1]||0)+1);return {ok:true,json:async()=>({content:{sha:shas[name]}})};}
   return {ok:true,json:async()=>({sha:env.conflict?'changed-sha':shas[name]||'current-sha',content:Buffer.from(books[name]).toString('base64')})};
  }
  if(target.includes('/v1/ayah/')){
   const [surah,ayah]=new URL(target).pathname.split('/')[3].split(':').map(Number);
   return {ok:true,json:async()=>({code:200,data:[{text:'Arabic test text',surah:{number:surah,englishName:'Test'},numberInSurah:ayah,edition:{identifier:'quran-uthmani'}},{text:'English test translation',surah:{number:surah},numberInSurah:ayah,edition:{identifier:'en.sahih',englishName:'Saheeh International'}}]})};
  }
  throw Error('Unexpected or local resource request: '+target);
 };
 vm.runInNewContext(script,env,{filename:location,timeout:10000});
 const flush=async()=>{for(let i=0;i<60;i++)await Promise.resolve();};await flush();
 return {html,env,requests,books,e:id=>document.getElementById(id),flush,action:(action,value)=>{const el=all.find(e=>e.dataset.action===action&&(value===undefined||e.dataset.value===value));assert(el,'Missing action '+action);return el.trigger('click');},delay:async ms=>{for(const[id,t]of [...timers])if(t.delay===ms){timers.delete(id);t.fn();}await flush();}};
}
test('all four output files embed every local script/style and contain no library text snapshots',()=>{
 for(const name of ['index.html','Editor.html','Test-Generator.html','admin/index.html']){
  const text=fs.readFileSync(path.join(__dirname,name),'utf8');assert(text.includes('dates-app-bundle'));assert(!/<script[^>]+src=/.test(text));assert(!/<link[^>]+rel="stylesheet"[^>]+href="(?!https:)/.test(text));
  assert(!text.includes(fixtures['Vocabulary-File.txt']));assert(text.includes('raw.githubusercontent.com'));
 }
});
for(const location of ['file:///C:/Moved%20Dates/renamed.html','file:///D:/USB/Quiz.html','https://example.org/a/deep/new/folder/study.html','http://localhost:9876/elsewhere/index.html']){
 test('main bundle works independently of its filename/location: '+location,async()=>{
  const app=await launch('index.html',location);assert(app.e('status-message').textContent.includes('Loaded 98 words'));
  for(const book of ['book_b','book_c','book_d']){app.e('vocabulary-book-selector').value=book;await app.e('vocabulary-book-selector').trigger('change');await app.flush();assert(!app.e('status-message').textContent.includes('Could not load'));}
  await app.action('triggerSelectedSession','flashcard');assert(app.e('card-arabic-field').textContent);await app.action('handleCardProgression');const word=app.e('card-arabic-field').textContent;
  await app.action('openWordDetails');await app.flush();assert(!app.e('verse-details-view').classList.contains('hidden'));assert.equal(app.e('verse-english').textContent,'English test translation');
  await app.action('closeWordDetails');assert.equal(app.e('card-arabic-field').textContent,word);assert(!app.e('card-meaning-field').classList.contains('hidden'));
  await app.action('exitToHome');await app.action('triggerSelectedSession','quiz');
  const meanings=Object.fromEntries(fixtures['Quran-Vocabulary-Meaning-Arabic-English.txt'].split(/\r?\n/).filter(line=>line.includes(' = ')).map(line=>{const[word,rest]=line.split(' = ');return[word.trim(),rest.split('=>')[0].trim()];}));
  for(let i=0;i<9;i++){const correct=meanings[app.e('quiz-arabic-field').textContent];const button=app.e('quiz-options-box').children.find(button=>button.textContent===correct);assert(button);await button.trigger('click');await app.delay(1200);}
  assert.equal(app.e('score-text-value').textContent,'9/9');
  await app.action('exitToHome');await app.action('openDictionaryMode');assert.equal(app.e('dictionary-count').textContent,'9 words');
  await app.action('exitToHome');await app.action('openQuest');await app.flush();assert(!app.e('quest-map-view').classList.contains('hidden'));await app.e('quest-continue').trigger('click');assert.equal(app.e('quest-review-counter').textContent,'Review 1 of 9');
  const questSaved=app.env.localStorage.getItem('quranaq.dates.quest.v2:books'),reviewWord=app.e('quest-review-word').textContent;
  await app.e('quest-review-details-btn').trigger('click');await app.flush();assert(app.e('quest-review-view').inert);assert(!app.e('verse-details-view').classList.contains('hidden'));
  await app.action('navigateWordVerse','1');await app.flush();assert.equal(app.e('verse-reference').textContent,'34:32');await app.action('closeWordDetails');
  assert(!app.e('quest-review-view').inert);assert.equal(app.e('quest-review-word').textContent,reviewWord);assert.equal(app.e('quest-review-counter').textContent,'Review 1 of 9');assert.equal(app.env.localStorage.getItem('quranaq.dates.quest.v2:books'),questSaved);
  for(let i=0;i<9;i++)await app.e('quest-review-next').trigger('click');
  const questionSaved=app.env.localStorage.getItem('quranaq.dates.quest.v2:books'),questionWord=app.e('quest-question-word').textContent;
  await app.e('quest-question-details-btn').trigger('click');await app.flush();assert(app.e('quest-quiz-view').inert);assert(app.e('verse-word-meaning').textContent.startsWith(questionWord));
  await app.action('closeWordDetails');assert(!app.e('quest-quiz-view').inert);assert.equal(app.e('quest-question-counter').textContent,'Question 1 of 9');assert.equal(app.env.localStorage.getItem('quranaq.dates.quest.v2:books'),questionSaved);
  const correctQuest=app.e('quest-answer-options').children.find(button=>button.textContent===meanings[questionWord]);await correctQuest.trigger('click');assert(app.e('quest-question-details-btn').disabled);
  await app.e('quest-question-details-btn').trigger('click');assert(app.e('verse-details-view').classList.contains('hidden'));await app.delay(1200);assert(!app.e('quest-question-details-btn').disabled);assert.equal(app.e('quest-question-counter').textContent,'Question 2 of 9');
  await app.action('exitToHome');app.env.failFile='Lughat-AlQuran-word-meaning.txt';app.e('vocabulary-book-selector').value='book_b';await app.e('vocabulary-book-selector').trigger('change');await app.flush();assert(app.e('status-message').textContent.includes('Could not load'));
  const libraryRequests=app.requests.filter(r=>r.url.includes('.txt'));assert(libraryRequests.every(r=>r.url.startsWith(prefix)));
 });
}
for(const location of ['file:///D:/Teacher/Renamed%20Editor.html','https://other.example/renamed-editor.html']){
 test('Editor reads and saves the same GitHub library after moving: '+location,async()=>{
  const app=await launch('Editor.html',location);app.e('login-book-selector').value='book_d';app.e('admin-passcode-box').value='test-only';app.e('admin-token-box').value='test-only-token';
  await app.e('editor-login-form').trigger('submit');await app.flush();await app.delay(300);assert(!app.e('lookup-go-btn').disabled);assert(app.e('edit-references-field').value.includes(':'));
  app.e('edit-references-field').value='Reviewed 2:255';await app.action('saveWordUpdateToGitHub');await app.flush();assert(app.e('toast-alert').textContent.includes('saved to GitHub'));
  const writes=app.requests.filter(r=>r.options.method==='PUT');assert.equal(writes.length,1);assert(writes[0].url.endsWith('/contents/Test2/Quran-Vocabulary-Meaning-Arabic-English.txt'));assert(app.books['Quran-Vocabulary-Meaning-Arabic-English.txt'].includes('Reviewed 2:255'));
 });
}
test('portable Generator authenticates from GitHub and produces a Book A code without local TXT/CP files',async()=>{
 const app=await launch('Test-Generator.html','file:///E:/Random/teacher.html');app.e('admin-passcode-box').value='test-only';await app.action('evaluateTeacherCredentials');await app.flush();await app.delay(300);
 const tiles=app.e('tiles-matrix-box').children;assert.equal(tiles.length,50);for(let i=0;i<20;i++)await app.e('tiles-matrix-box').trigger('click',{target:tiles[i]});
 await app.action('processSelectedHexadecimalQuizCode');assert(app.e('quiz-code-output').value.length>0);assert(!app.e('copy-code-btn').disabled);
});

async function adminLogin(app){app.e('admin-password').value='test-only';app.e('admin-token').value='test-only-token';await app.e('admin-login').trigger('submit');await app.flush();assert(!app.e('admin-settings').classList.contains('hidden'));}
const cell=(app,row,column)=>app.e('admin-matrix').children[row+1].children[column+1].children[0];
test('separate admin cycles emoji states, Cancel discards edits, Save writes only dbs for students to reload',async()=>{
 const app=await launch('admin/index.html','file:///D:/Moved/admin/index.html');await adminLogin(app);
 assert.equal(app.e('admin-matrix').children.length,5);assert.equal(cell(app,0,1).textContent,'\u2705 Enable');
 await cell(app,0,1).trigger('click');assert.equal(cell(app,0,1).textContent,'\u26d4 Disable');await cell(app,0,1).trigger('click');assert.equal(cell(app,0,1).textContent,'\ud83d\ude48 Hide');await cell(app,0,1).trigger('click');assert.equal(cell(app,0,1).textContent,'\u2705 Enable');
 await cell(app,0,1).trigger('click');await app.e('admin-cancel').trigger('click');assert.equal(app.requests.filter(r=>r.options.method==='PUT').length,0);
 assert(!app.e('admin-settings').classList.contains('hidden'));assert.equal(cell(app,0,1).textContent,'\u2705 Enable');await cell(app,0,1).trigger('click');await cell(app,0,2).trigger('click');await cell(app,0,2).trigger('click');
 await app.e('admin-save').trigger('click');await app.flush();assert(!app.e('admin-settings').classList.contains('hidden'));assert(app.e('admin-message').textContent.includes('Saved'));
 const saved=JSON.parse(app.books['dbs.json']);assert.equal(saved.books.book_a.review,'disable');assert.equal(saved.books.book_a.quiz,'hide');
 assert.equal(app.requests.filter(r=>r.options.method==='PUT').length,1);assert(app.requests.find(r=>r.options.method==='PUT').url.endsWith('/Test2/dbs.json'));
 const student=await launch('index.html','file:///D:/Moved/student.html',saved);await student.action('triggerSelectedSession','flashcard');assert(student.e('flashcard-view').classList.contains('hidden'));
 assert(!app.e('admin-token').value);assert(!app.e('admin-password').value);
});
test('admin rejects wrong password, write failure and concurrent edits without changing live settings',async()=>{
 const app=await launch('admin/index.html','https://moved.example/admin/');app.e('admin-password').value='wrong';app.e('admin-token').value='test-only-token';await app.e('admin-login').trigger('submit');assert(app.e('admin-message').textContent.includes('Invalid password'));assert(app.e('admin-settings').classList.contains('hidden'));
 await app.e('admin-close').trigger('click');await adminLogin(app);await cell(app,0,1).trigger('click');app.env.failSave=true;await app.e('admin-save').trigger('click');assert(app.e('admin-message').textContent.includes('Save failed'));assert(!app.e('admin-settings').classList.contains('hidden'));assert.equal(JSON.parse(app.books['dbs.json']).books.book_a.review,'enable');
 app.env.failSave=false;app.env.conflict=true;const writes=app.requests.filter(r=>r.options.method==='PUT').length;await app.e('admin-save').trigger('click');assert(app.e('admin-message').textContent.includes('changed elsewhere'));assert.equal(app.requests.filter(r=>r.options.method==='PUT').length,writes);
});
test('all books disabled or hidden remain recoverable with exactly seven Go taps; override is session-only',async()=>{
 const settings=JSON.parse(JSON.stringify(defaultDashboard));for(const row of Object.values(settings.books))for(const key of Object.keys(row))row[key]='hide';settings.books.book_a.state='disable';
 const app=await launch('index.html','file:///E:/Quiz.html',settings);assert.equal(app.e('vocabulary-book-selector').value,'');assert(!app.e('quiz-code-btn').disabled);assert(app.e('quiz-code-field').classList.contains('hidden')||app.e('quiz-code-field').disabled);
 for(let i=0;i<6;i++)await app.action('handleGoClick');assert.equal(app.e('vocabulary-book-selector').value,'');await app.action('handleGoClick');await app.flush();assert.equal(app.e('vocabulary-book-selector').value,'book_a');assert(app.e('status-message').textContent.includes('Loaded 98'));
 assert.equal(app.requests.filter(r=>r.options.method==='PUT').length,0);assert.deepEqual(JSON.parse(app.books['dbs.json']),settings);
 app.e('vocabulary-book-selector').value='book_c';await app.e('vocabulary-book-selector').trigger('change');await app.flush();assert(!app.e('quiz-code-field').disabled);await app.action('openDictionaryMode');assert(!app.e('dictionary-view').classList.contains('hidden'));
 const reload=await launch('index.html','file:///E:/Quiz.html',settings);assert.equal(reload.e('vocabulary-book-selector').value,'');
});
test('book and feature visibility are applied per book without altering other books',async()=>{
 const settings=JSON.parse(JSON.stringify(defaultDashboard));settings.books.book_b.state='hide';settings.books.book_d.state='disable';settings.books.book_a.quest='hide';settings.books.book_a.review='disable';settings.books.book_a.quizCode='hide';
 const app=await launch('index.html','file:///C:/Portable/main.html',settings);const options=app.e('vocabulary-book-selector').children;assert(!options.some(option=>option.value==='book_b'));assert(options.find(option=>option.value==='book_d').disabled);assert(!options[0].disabled);assert(app.e('quiz-code-field').classList.contains('hidden'));assert(app.e('quiz-code-entry').classList.contains('hidden'));assert(app.e('quiz-code-btn').classList.contains('hidden'));
 await app.action('openQuest');assert(app.e('quest-map-view').classList.contains('hidden'));await app.action('triggerSelectedSession','flashcard');assert(app.e('flashcard-view').classList.contains('hidden'));await app.action('triggerSelectedSession','quiz');assert(!app.e('quiz-view').classList.contains('hidden'));
});

test('invalid dashboard data fails closed while seven-tap student recovery remains available',async()=>{
 const app=await launch('index.html','file:///D:/Dates.html',{schema:99,books:{}});assert.equal(app.e('vocabulary-book-selector').value,'');assert(!app.e('quiz-code-btn').disabled);for(let i=0;i<7;i++)await app.action('handleGoClick');await app.flush();assert(app.e('status-message').textContent.includes('Loaded 98'));
});
test('enabled Book C quiz codes use their own book identity and keep verification boundaries',async()=>{
 const settings=JSON.parse(JSON.stringify(defaultDashboard));settings.books.book_c.quizCode='enable';const app=await launch('index.html','https://portable.example/dates.html',settings);app.e('vocabulary-book-selector').value='book_c';await app.e('vocabulary-book-selector').trigger('change');await app.flush();app.e('quiz-code-field').value='C3:'+Array.from({length:10},(_,i)=>String(i+1).padStart(4,'0')).join('.');await app.action('handleGoClick');await app.flush();assert(!app.e('quiz-participant-view').classList.contains('hidden'));assert(app.e('participant-quiz-info').textContent.startsWith('Book C'));
});

test('student contains only study controls while admin is a portable separate module under /admin',async()=>{
 const student=await launch('index.html','https://example.org/dates/');assert(!student.html.includes('admin-open'));assert(!student.html.includes('admin-matrix'));assert(!student.html.includes('initializeAdminPanel'));assert(!student.html.includes('admin-token'));assert(student.html.includes('study-mode-group'));assert(/study-mode-group[\s\S]*?segmented-slider-container[\s\S]*?study-mode-buttons[\s\S]*?secondary-modes/.test(student.html));
 for(const location of ['https://example.org/admin/','file:///D:/Moved/Admin.html']){const admin=await launch('admin/index.html',location);assert(!admin.html.includes('menu-view'));await adminLogin(admin);assert.equal(cell(admin,0,0).textContent,'\u2705 Enable');await cell(admin,0,0).trigger('click');assert.equal(cell(admin,0,0).textContent,'\u26d4 Disable');await cell(admin,0,0).trigger('click');assert.equal(cell(admin,0,0).textContent,'\ud83d\ude48 Hide');assert(!admin.e('admin-matrix').textContent.includes('?'));await admin.e('admin-cancel').trigger('click');assert.equal(admin.requests.filter(r=>r.options.method==='PUT').length,0);}
});

test('Save keeps authentication and new SHA for repeat saves; Cancel restores current remote state; Sign out never writes',async()=>{
 const app=await launch('admin/index.html','https://quiz.example/admin/');await adminLogin(app);await cell(app,0,0).trigger('click');await app.e('admin-save').trigger('click');assert(!app.e('admin-settings').classList.contains('hidden'));assert.equal(cell(app,0,0).textContent,'\u26d4 Disable');await cell(app,0,0).trigger('click');await app.e('admin-save').trigger('click');assert(!app.e('admin-settings').classList.contains('hidden'));assert.equal(JSON.parse(app.books['dbs.json']).books.book_a.state,'hide');
 const remote=JSON.parse(app.books['dbs.json']);remote.books.book_b.quiz='disable';app.books['dbs.json']=JSON.stringify(remote);await cell(app,0,0).trigger('click');await app.e('admin-cancel').trigger('click');assert(!app.e('admin-settings').classList.contains('hidden'));assert.equal(cell(app,0,0).textContent,'\ud83d\ude48 Hide');assert.equal(cell(app,1,2).textContent,'\u26d4 Disable');const count=app.requests.filter(r=>r.options.method==='PUT').length;await cell(app,0,0).trigger('click');await app.e('admin-close').trigger('click');assert(app.e('admin-settings').classList.contains('hidden'));assert.equal(app.requests.filter(r=>r.options.method==='PUT').length,count);
});
test('home refresh removes hidden books, updates buttons/code row, and restores options on enable',async()=>{
 const app=await launch('index.html','file:///C:/Dates/index.html');const settings=JSON.parse(JSON.stringify(defaultDashboard));settings.books.book_b.state='hide';settings.books.book_a.quiz='hide';settings.books.book_a.quizCode='hide';app.books['dbs.json']=JSON.stringify(settings);await app.delay(15000);assert(!app.e('vocabulary-book-selector').children.some(o=>o.value==='book_b'));assert(app.e('quiz-code-entry').classList.contains('hidden'));assert(app.e('quiz-code-btn').classList.contains('hidden'));await app.action('triggerSelectedSession','quiz');assert(app.e('quiz-view').classList.contains('hidden'));
 settings.books.book_b.state='enable';settings.books.book_a.quiz='enable';settings.books.book_a.quizCode='enable';app.books['dbs.json']=JSON.stringify(settings);await app.delay(15000);assert(app.e('vocabulary-book-selector').children.some(o=>o.value==='book_b'));assert(!app.e('quiz-code-entry').classList.contains('hidden'));assert(!app.e('quiz-code-btn').classList.contains('hidden'));await app.action('openQuest');assert(app.e('quest-book-selector').children.some(o=>o.value==='book_b'));
});
