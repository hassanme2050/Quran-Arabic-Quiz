const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const source=__dirname,project=path.resolve('.github/android-package-build'),out=path.resolve('quranfahm-apk-fix-output');
const run=(bin,args)=>cp.execFileSync(bin,args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
if(process.argv[2]==='prepare'){
  if(process.env.GITHUB_RUN_NUMBER!=='1')throw Error('Initial signing-key creation is limited to the first build. Future releases must reuse the saved upload key.');
  fs.mkdirSync(out,{recursive:true});
  const password=crypto.randomBytes(32).toString('base64url'),alias='quranfahm-upload',keystore=path.join(process.env.RUNNER_TEMP,'quranfahm-upload.p12');
  process.stdout.write('::add-mask::'+password+'\n');
  run('keytool',['-genkeypair','-noprompt','-keystore',keystore,'-storetype','PKCS12','-storepass',password,'-keypass',password,'-alias',alias,'-keyalg','RSA','-keysize','4096','-sigalg','SHA256withRSA','-validity','10000','-dname','CN=QuranFahm.app']);
  const certificate=run('keytool',['-exportcert','-rfc','-keystore',keystore,'-storepass',password,'-alias',alias]);
  fs.writeFileSync(path.join(out,'upload-certificate.pem'),certificate);
  const secret=Buffer.from(JSON.stringify({keystore:fs.readFileSync(keystore).toString('base64'),password,alias,storeType:'PKCS12',applicationId:'com.hassanme2050.quranfahm'}));
  const key=crypto.randomBytes(32),iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv),encrypted=Buffer.concat([cipher.update(secret),cipher.final()]);
  const wrapped=crypto.publicEncrypt({key:fs.readFileSync(path.join(source,'backup-public.pem')),oaepHash:'sha256'},key);
  fs.writeFileSync(path.join(out,'signing-backup.encrypted.json'),JSON.stringify({schema:1,algorithm:'RSA-OAEP-SHA256+AES-256-GCM',wrappedKey:wrapped.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:encrypted.toString('base64')},null,2));
  fs.appendFileSync(process.env.GITHUB_ENV,'QF_KEYSTORE='+keystore+'\nQF_STORE_PASSWORD='+password+'\nQF_KEY_ALIAS='+alias+'\n');
  fs.writeFileSync(path.join(project,'app/build.gradle'),`plugins { id 'com.android.application' }
android {
 namespace 'com.hassanme2050.quranaq'
 compileSdk 36
 buildFeatures { buildConfig true }
 defaultConfig { applicationId 'com.hassanme2050.quranfahm'; minSdk 23; targetSdk 36; versionCode 110727; versionName '1107.26.1' }
 flavorDimensions += 'version'
 productFlavors { dates { dimension 'version'; resValue 'string','app_name','QuranFahm.app' } }
 signingConfigs { release { storeFile file(System.getenv('QF_KEYSTORE')); storePassword System.getenv('QF_STORE_PASSWORD'); keyAlias System.getenv('QF_KEY_ALIAS'); keyPassword System.getenv('QF_STORE_PASSWORD') } }
 buildTypes { release { signingConfig signingConfigs.release; minifyEnabled false } }
 compileOptions { sourceCompatibility JavaVersion.VERSION_17; targetCompatibility JavaVersion.VERSION_17 }
}
dependencies { implementation 'androidx.webkit:webkit:1.14.0' }
`);
  const flavor=path.join(project,'app/src/dates'),drawable=path.join(flavor,'res/drawable-nodpi');fs.mkdirSync(drawable,{recursive:true});
  fs.writeFileSync(path.join(drawable,'quranfahm_app_icon.png'),Buffer.from(fs.readFileSync(path.join(source,'app-icon.png.base64'),'utf8').trim(),'base64'));
  fs.writeFileSync(path.join(flavor,'AndroidManifest.xml'),'<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools"><application android:icon="@drawable/quranfahm_app_icon" tools:replace="android:icon" /></manifest>');
  console.log('Release signing and QuranFahm icon prepared. The private key backup is encrypted for the local machine.');
}else if(process.argv[2]==='collect'){
  for(const [from,to] of [['app/build/outputs/apk/dates/release/app-dates-release.apk','QuranFahm.app-v1107.26-InstallFix.apk']])fs.copyFileSync(path.join(project,from),path.join(out,to));
  fs.writeFileSync(path.join(out,'build-info.json'),JSON.stringify({app:'QuranFahm.app',applicationId:'com.hassanme2050.quranfahm',versionName:'1107.26.1',versionCode:110727,minSdk:23,targetSdk:36,commit:process.env.GITHUB_SHA,run:process.env.GITHUB_RUN_ID,signing:'New dedicated release/upload key; encrypted backup retained locally',library:'https://raw.githubusercontent.com/hassanme2050/Quran-Arabic-Quiz/main/'},null,2));
  const files=fs.readdirSync(out);fs.writeFileSync(path.join(out,'SHA256SUMS.txt'),files.map(f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(out,f))).digest('hex')+'  '+f).join('\n')+'\n');
  for(const name of fs.readdirSync(out)){const data=fs.readFileSync(path.join(out,name));console.log('QF_META|'+JSON.stringify({name,size:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')}));const b64=data.toString('base64');for(let i=0;i<b64.length;i+=48000)console.log('QF_DATA|'+name+'|'+Math.floor(i/48000)+'|'+b64.slice(i,i+48000));console.log('QF_COMPLETE|'+name);}
}else throw Error('Choose prepare or collect');
