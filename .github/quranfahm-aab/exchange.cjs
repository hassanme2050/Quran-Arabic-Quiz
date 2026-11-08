const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const repo=process.env.GITHUB_REPOSITORY,runId=process.env.GITHUB_RUN_ID;
const base='.github/quranfahm-aab/exchange/'+runId;
const api='https://api.github.com/repos/'+repo+'/contents/';
const headers={Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};
async function request(url,options={}){const r=await fetch(url,{...options,headers:{...headers,...options.headers,'Cache-Control':'no-cache'}});if(!r.ok)throw Error('GitHub API '+r.status+' '+(await r.text()).slice(0,300));return r.status===204?null:r.json();}
async function put(p,data){return request(api+p,{method:'PUT',body:JSON.stringify({message:'Temporary encrypted release signing exchange',content:Buffer.from(data).toString('base64'),branch:'main'})});}
async function get(p){const r=await fetch(api+p+'?ref=main&cachebust='+Date.now(),{headers:{...headers,'Cache-Control':'no-cache'}});if(r.status===404)return null;if(!r.ok)throw Error('GitHub API '+r.status);const j=await r.json();return {json:JSON.parse(Buffer.from(j.content.replace(/\s/g,''),'base64').toString()),sha:j.sha};}
async function remove(p){const x=await get(p);if(!x)return;await request(api+p,{method:'DELETE',body:JSON.stringify({message:'Remove temporary release signing exchange',sha:x.sha,branch:'main'})});}
(async()=>{
 const mode=process.argv[2];
 if(mode==='prepare'){
   const {publicKey,privateKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
   fs.writeFileSync(path.join(process.env.RUNNER_TEMP,'qf-aab-exchange-private.pem'),privateKey,{mode:0o600});
   await put(base+'.json',JSON.stringify({runId,publicKey}));
   console.log('Temporary signing exchange is ready; awaiting locally encrypted upload key.');
   let payload;
   for(let i=0;i<180;i++){payload=await get(base+'-payload.json');if(payload)break;await new Promise(r=>setTimeout(r,3000));}
   if(!payload)throw Error('Timed out waiting for encrypted signing material.');
   const env=payload.json;if(env.runId!==runId)throw Error('Signing exchange run ID mismatch.');
   const aes=crypto.privateDecrypt({key:privateKey,oaepHash:'sha256'},Buffer.from(env.wrappedKey,'base64'));
   const dec=crypto.createDecipheriv('aes-256-gcm',aes,Buffer.from(env.iv,'base64'));dec.setAuthTag(Buffer.from(env.tag,'base64'));
   const secret=JSON.parse(Buffer.concat([dec.update(Buffer.from(env.ciphertext,'base64')),dec.final()]).toString());
   if(secret.applicationId!=='com.hassanme2050.quranfahm'||secret.alias!=='quranfahm-upload')throw Error('Unexpected app signing identity.');
   const keystore=path.join(process.env.RUNNER_TEMP,'quranfahm-upload.p12');
   fs.writeFileSync(keystore,Buffer.from(secret.keystore,'base64'),{mode:0o600});
   process.stdout.write('::add-mask::'+secret.password+'\n');
   fs.appendFileSync(process.env.GITHUB_ENV,'QF_KEYSTORE='+keystore+'\nQF_STORE_PASSWORD='+secret.password+'\nQF_KEY_ALIAS='+secret.alias+'\n');
   const project=path.resolve('.github/android-package-build'),flavor=path.join(project,'app/src/dates'),drawable=path.join(flavor,'res/drawable-nodpi');
   fs.mkdirSync(drawable,{recursive:true});
   fs.writeFileSync(path.join(drawable,'quranfahm_app_icon.png'),Buffer.from(fs.readFileSync('.github/quranfahm-apk-install-fix/app-icon.png.base64','utf8').trim(),'base64'));
   fs.writeFileSync(path.join(flavor,'AndroidManifest.xml'),'<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools"><application android:icon="@drawable/quranfahm_app_icon" tools:replace="android:icon" /></manifest>');
   fs.writeFileSync(path.join(project,'app/build.gradle'),[
     "plugins { id 'com.android.application' }",
     'android {',
     " namespace 'com.hassanme2050.quranaq'",
     ' compileSdk 36',
     ' buildFeatures { buildConfig true }',
     " defaultConfig { applicationId 'com.hassanme2050.quranfahm'; minSdk 23; targetSdk 36; versionCode 110727; versionName '1107.26.1' }",
     " flavorDimensions += 'version'",
     " productFlavors { dates { dimension 'version'; resValue 'string','app_name','QuranFahm.app' } }",
     " signingConfigs { release { storeFile file(System.getenv('QF_KEYSTORE')); storePassword System.getenv('QF_STORE_PASSWORD'); keyAlias System.getenv('QF_KEY_ALIAS'); keyPassword System.getenv('QF_STORE_PASSWORD') } }",
     " buildTypes { release { signingConfig signingConfigs.release; minifyEnabled false } }",
     ' compileOptions { sourceCompatibility JavaVersion.VERSION_17; targetCompatibility JavaVersion.VERSION_17 }',
     '}',
     "dependencies { implementation 'androidx.webkit:webkit:1.14.0' }"
   ].join('\n')+'\n');
   console.log('Signing key, package identity and updated app icon are prepared.');
 }else if(mode==='collect'){
   const out='quranfahm-aab-output';fs.mkdirSync(out,{recursive:true});
   const src='.github/android-package-build/app/build/outputs/bundle/datesRelease/app-dates-release.aab';
   const dst=path.join(out,'QuranFahm.app-v1107.26-InstallFix.aab');fs.copyFileSync(src,dst);
   fs.writeFileSync(path.join(out,'build-info.json'),JSON.stringify({app:'QuranFahm.app',applicationId:'com.hassanme2050.quranfahm',versionName:'1107.26.1',versionCode:110727,minSdk:23,targetSdk:36,signingCertificateSha256:'c23f8d3c1a69be94effa38e05f589f57c4cb8f1f0165523f342c6178eb9a3fea',library:'https://raw.githubusercontent.com/hassanme2050/Quran-Arabic-Quiz/main/'},null,2));
   for(const name of fs.readdirSync(out)){const data=fs.readFileSync(path.join(out,name));console.log('QF_META|'+JSON.stringify({name,size:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')}));const b64=data.toString('base64');for(let i=0;i<b64.length;i+=48000)console.log('QF_DATA|'+name+'|'+Math.floor(i/48000)+'|'+b64.slice(i,i+48000));console.log('QF_COMPLETE|'+name);}
 }else if(mode==='cleanup'){
   for(const suffix of ['.json','-payload.json'])await remove(base+suffix);
   try{fs.unlinkSync(path.join(process.env.RUNNER_TEMP,'qf-aab-exchange-private.pem'));}catch{}
   try{fs.unlinkSync(path.join(process.env.RUNNER_TEMP,'quranfahm-upload.p12'));}catch{}
   console.log('Temporary signing exchange files removed.');
 }else throw Error('Use prepare, collect or cleanup.');
})().catch(e=>{console.error(e.message);process.exit(1)});
