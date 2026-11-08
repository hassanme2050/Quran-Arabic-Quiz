const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const runId=process.env.GITHUB_RUN_ID;
(async()=>{
 const mode=process.argv[2];
 if(mode==='generate'){
   const dir='qf-exchange';fs.mkdirSync(dir,{recursive:true});
   const kp=crypto.generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
   fs.writeFileSync(path.join(dir,'public.pem'),kp.publicKey);
   const password=crypto.randomBytes(32).toString('base64url'),key=crypto.randomBytes(32),iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv),encrypted=Buffer.concat([cipher.update(kp.privateKey),cipher.final()]);
   fs.writeFileSync(path.join(dir,'private.enc.json'),JSON.stringify({iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:encrypted.toString('base64')}));
   fs.appendFileSync(process.env.GITHUB_OUTPUT,'public-key='+Buffer.from(kp.publicKey).toString('base64')+'\nartifact-password='+password+'\n');
   console.log('QF_PUBLIC_KEY|'+Buffer.from(kp.publicKey).toString('base64'));
   console.log('Ephemeral public key generated; private exchange key is encrypted in a short-lived Actions artifact.');
 }else if(mode==='prepare'){
   const encoded=JSON.parse(fs.readFileSync('qf-exchange/private.enc.json','utf8'));
   const dec=crypto.createDecipheriv('aes-256-gcm',Buffer.from(process.env.QF_EXCHANGE_PASSWORD,'base64url'),Buffer.from(encoded.iv,'base64'));dec.setAuthTag(Buffer.from(encoded.tag,'base64'));
   const privateKey=Buffer.concat([dec.update(Buffer.from(encoded.ciphertext,'base64')),dec.final()]).toString();
   const publicKey=fs.readFileSync('qf-exchange/public.pem','utf8');
   const raw='https://raw.githubusercontent.com/hassanme2050/Quran-Arabic-Quiz/main/.github/quranfahm-aab/exchange/'+runId+'-payload.json';
   console.log('Ephemeral key recovered; waiting for locally encrypted upload key.');
   let payload;
   for(let i=0;i<180;i++){const r=await fetch(raw+'?t='+Date.now(),{cache:'no-store'});if(r.ok){payload=await r.json();break;}await new Promise(r=>setTimeout(r,5000));}
   if(!payload)throw Error('Timed out waiting for encrypted signing material.');
   if(String(payload.runId)!==String(runId))throw Error('Signing exchange run ID mismatch.');
   const aes=crypto.privateDecrypt({key:privateKey,oaepHash:'sha256'},Buffer.from(payload.wrappedKey,'base64'));
   const decipher=crypto.createDecipheriv('aes-256-gcm',aes,Buffer.from(payload.iv,'base64'));decipher.setAuthTag(Buffer.from(payload.tag,'base64'));
   const secret=JSON.parse(Buffer.concat([decipher.update(Buffer.from(payload.ciphertext,'base64')),decipher.final()]).toString());
   if(secret.applicationId!=='com.hassanme2050.quranfahm'||secret.alias!=='quranfahm-upload')throw Error('Unexpected app signing identity.');
   const keystore=path.join(process.env.RUNNER_TEMP,'quranfahm-upload.p12');fs.writeFileSync(keystore,Buffer.from(secret.keystore,'base64'),{mode:0o600});
   process.stdout.write('::add-mask::'+secret.password+'\n::add-mask::'+process.env.QF_EXCHANGE_PASSWORD+'\n');
   fs.appendFileSync(process.env.GITHUB_ENV,'QF_KEYSTORE='+keystore+'\nQF_STORE_PASSWORD='+secret.password+'\nQF_KEY_ALIAS='+secret.alias+'\n');
   const project=path.resolve('.github/android-package-build'),flavor=path.join(project,'app/src/dates'),drawable=path.join(flavor,'res/drawable-nodpi');fs.mkdirSync(drawable,{recursive:true});
   fs.writeFileSync(path.join(drawable,'quranfahm_app_icon.png'),Buffer.from(fs.readFileSync('.github/quranfahm-apk-install-fix/app-icon.png.base64','utf8').trim(),'base64'));
   fs.writeFileSync(path.join(flavor,'AndroidManifest.xml'),'<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools"><application android:icon="@drawable/quranfahm_app_icon" tools:replace="android:icon" /></manifest>');
   fs.writeFileSync(path.join(project,'app/build.gradle'),[
     "plugins { id 'com.android.application' }","android {",
     " namespace 'com.hassanme2050.quranaq'",' compileSdk 36',' buildFeatures { buildConfig true }',
     " defaultConfig { applicationId 'com.hassanme2050.quranfahm'; minSdk 23; targetSdk 36; versionCode 110727; versionName '1107.26.1' }",
     " flavorDimensions += 'version'"," productFlavors { dates { dimension 'version'; resValue 'string','app_name','QuranFahm.app' } }",
     " signingConfigs { release { storeFile file(System.getenv('QF_KEYSTORE')); storePassword System.getenv('QF_STORE_PASSWORD'); keyAlias System.getenv('QF_KEY_ALIAS'); keyPassword System.getenv('QF_STORE_PASSWORD') } }",
     " buildTypes { release { signingConfig signingConfigs.release; minifyEnabled false } }",
     ' compileOptions { sourceCompatibility JavaVersion.VERSION_17; targetCompatibility JavaVersion.VERSION_17 }','}',
     "dependencies { implementation 'androidx.webkit:webkit:1.14.0' }"
   ].join('\n')+'\n');
   console.log('Same app ID, version, icon and saved upload key are prepared.');
 }else if(mode==='collect'){
   const out='quranfahm-aab-output';fs.mkdirSync(out,{recursive:true});
   const src='.github/android-package-build/app/build/outputs/bundle/datesRelease/app-dates-release.aab';
   const dst=path.join(out,'QuranFahm.app-v1107.26-InstallFix.aab');fs.copyFileSync(src,dst);
   fs.writeFileSync(path.join(out,'build-info.json'),JSON.stringify({app:'QuranFahm.app',applicationId:'com.hassanme2050.quranfahm',versionName:'1107.26.1',versionCode:110727,minSdk:23,targetSdk:36,signingCertificateSha256:'c23f8d3c1a69be94effa38e05f589f57c4cb8f1f0165523f342c6178eb9a3fea',library:'https://raw.githubusercontent.com/hassanme2050/Quran-Arabic-Quiz/main/'},null,2));
   for(const name of fs.readdirSync(out)){const data=fs.readFileSync(path.join(out,name));console.log('QF_META|'+JSON.stringify({name,size:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')}));const b64=data.toString('base64');for(let i=0;i<b64.length;i+=48000)console.log('QF_DATA|'+name+'|'+Math.floor(i/48000)+'|'+b64.slice(i,i+48000));console.log('QF_COMPLETE|'+name);}
 }else if(mode==='cleanup'){
   for(const p of [path.join(process.env.RUNNER_TEMP,'qf-aab-exchange-private.pem'),path.join(process.env.RUNNER_TEMP,'quranfahm-upload.p12')])try{fs.unlinkSync(p);}catch{}
   console.log('Temporary runner signing files removed.');
 }else throw Error('Use generate, prepare, collect or cleanup.');
})().catch(e=>{console.error(e.message);process.exit(1)});
