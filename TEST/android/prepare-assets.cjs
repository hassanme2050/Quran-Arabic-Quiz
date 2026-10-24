const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const output = path.join(__dirname, 'app/src/main/assets/www');
fs.mkdirSync(output, {recursive:true});
for (const file of ['index.html', 'Vocabulary-File.txt']) fs.copyFileSync(path.join(root,file),path.join(output,file));
for (const dir of ['css','js','shared']) fs.cpSync(path.join(root,dir),path.join(output,dir),{recursive:true});
for (const dir of ['fonts','vendor','licenses']) fs.mkdirSync(path.join(output,dir),{recursive:true});
let typography = fs.readFileSync(path.join(output,'shared/typography.css'),'utf8');
typography = typography.replace(/^@import[^\n]*\n/, `@font-face { font-family:'Alexandria'; font-style:normal; font-weight:100 900; font-display:swap; src:url('../fonts/Alexandria.ttf') format('truetype'); }\n`);
fs.writeFileSync(path.join(output,'shared/typography.css'),typography);
let platform = fs.readFileSync(path.join(output,'js/platform.js'),'utf8');
platform = platform.replace('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js', 'vendor/html2canvas.min.js');
platform = platform.replace("        const blob = await new Promise", `        if (globalThis.Android && typeof globalThis.Android.saveScorecard === 'function') {
            globalThis.Android.saveScorecard(canvas.toDataURL('image/png'));
            launchToastAlert('Choose where to save your scorecard.');
            return;
        }
        const blob = await new Promise`);
fs.writeFileSync(path.join(output,'js/platform.js'),platform);
let html = fs.readFileSync(path.join(output,'index.html'),'utf8');
html = html.replace(/^.*rel="preconnect".*\n/gm,'').replace('📋 Copy Screenshot to Clipboard','💾 Save Scorecard');
fs.writeFileSync(path.join(output,'index.html'),html);
console.log('Prepared bundled student app assets from ' + root);
