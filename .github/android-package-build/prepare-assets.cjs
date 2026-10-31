const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=__dirname,source=path.resolve(process.argv[2]),variant=process.argv[3];
if(!['strawberry','dates'].includes(variant))throw Error('Choose strawberry or dates');
const work=path.join(root,'prepared-'+variant),app=path.join(work,'source');fs.mkdirSync(app,{recursive:true});
for(const name of ['index.html','Editor.html','Test-Generator.html'])fs.copyFileSync(path.join(source,name),path.join(app,name));
for(const dir of ['js','shared','css','editor','test-generator','vendor','licenses','resources'])fs.cpSync(path.join(source,dir),path.join(app,dir),{recursive:true});
// Both Android packages use the maintained online library, never a bundled TXT snapshot.
fs.writeFileSync(path.join(app,'shared/android-library.js'),`export const prefix='https://raw.githubusercontent.com/hassanme2050/Quran-Arabic-Quiz/main/Test2/';\n`);
const vocabulary=path.join(app,'shared/vocabulary.js');let v=fs.readFileSync(vocabulary,'utf8');
v=v.replace(/return new URL\('\.\.\/' \+ filename, import\.meta\.url\);/,"return new URL('https://raw.githubusercontent.com/hassanme2050/Quran-Arabic-Quiz/main/Test2/'+encodeURIComponent(filename));");fs.writeFileSync(vocabulary,v);
const github=path.join(app,'editor/js/github.js');fs.writeFileSync(github,fs.readFileSync(github,'utf8').replace(/export function repositoryVocabularyPath[\s\S]*?\n}/,"export function repositoryVocabularyPath(filename,moduleUrl){if(!Object.values(BOOK_FILES).includes(filename))throw new Error('Unknown vocabulary file.');return 'Test2/'+filename;\n}"));
// The APK native document picker handles PNG saving and Quest JSON import/export.
const platform=path.join(app,'js/platform.js');let p=fs.readFileSync(platform,'utf8');
p=p.replace('const image=captureScorecard();',`const image=captureScorecard();
        if(globalThis.Android?.saveScorecard){const blob=await image;const encoded=btoa(Array.from(new Uint8Array(await blob.arrayBuffer()),b=>String.fromCharCode(b)).join(''));Android.saveScorecard('data:image/png;base64,'+encoded);status('Choose where to save your scorecard.');return;}`);
fs.writeFileSync(platform,p);
const quest=path.join(app,'js/quest.js');let q=fs.readFileSync(quest,'utf8');
q=q.replace('function exportProgress() {',`function exportProgress() {
    if(globalThis.Android?.saveFile){const json=JSON.stringify(store.backup(),null,2);const encoded=btoa(Array.from(new TextEncoder().encode(json),b=>String.fromCharCode(b)).join(''));Android.saveFile('data:application/json;base64,'+encoded,'QuranAQ-Quest-All-Books-Progress.json','application/json');launchToastAlert('Choose where to save your progress.');return;}`);
fs.writeFileSync(quest,q);
const assetRoot=path.join(root,'app/src',variant,'assets/www');fs.mkdirSync(assetRoot,{recursive:true});
if(variant==='dates'){
    const storage=path.join(app,'js/quest-storage.js');let s=fs.readFileSync(storage,'utf8');s=s.replace(/'quranaq\.quest\.v1:book_a:'\+new URL\('\.\.\/',import\.meta\.url\)\.pathname/,"'quranaq.dates.quest.v1:book_a'").replace(/'quranaq\.quest\.v2:books:'\+new URL\('\.\.\/',import\.meta\.url\)\.pathname/,"'quranaq.dates.quest.v2:books'");fs.writeFileSync(storage,s);
    const font=fs.readFileSync(path.join(app,'resources/font/kfgqpc_hafs_v30.ttf')).toString('base64');const css=path.join(app,'css/app.css');fs.writeFileSync(css,fs.readFileSync(css,'utf8').replace('../resources/font/kfgqpc_hafs_v30.ttf','data:font/ttf;base64,'+font));
    // Inline renderer means no import.meta/local module dependency in the single-file package.
    fs.writeFileSync(platform,fs.readFileSync(platform,'utf8').replace("script.src=new URL('../vendor/html2canvas.min.js',import.meta.url).href;","reject(new Error('Embedded renderer unavailable.'));return;"));
    fs.copyFileSync(path.join(root,'portable-packer.cjs'),path.join(work,'build-portable.cjs'));
    // The packer also creates teacher HTML files; they are bundled assets, not published web pages.
    cp.execFileSync(process.execPath,[path.join(work,'build-portable.cjs')],{stdio:'inherit'});
    for(const file of ['index.html','Editor.html','Test-Generator.html'])fs.copyFileSync(path.join(work,file),path.join(assetRoot,file));
}else{
    for(const file of ['index.html','Editor.html','Test-Generator.html'])fs.copyFileSync(path.join(app,file),path.join(assetRoot,file));
    for(const dir of ['js','shared','css','editor','test-generator','vendor','licenses','resources'])fs.cpSync(path.join(app,dir),path.join(assetRoot,dir),{recursive:true});
}
for(const book of ['Vocabulary-File.txt','Lughat-AlQuran-word-meaning.txt','Tajweed-Question-Bank.txt','Quran-Vocabulary-Meaning-Arabic-English.txt','CP.txt'])if(fs.existsSync(path.join(assetRoot,book)))throw Error('Local library must not be bundled: '+book);
console.log('Prepared '+variant+' from approved Strawberry. Library remains GitHub Test2.');
