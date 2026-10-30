import {launchToastAlert} from './ui.js?v=1030.26-strawberry2';
let rendererPromise,lastCapture,busy=false;
function loadScorecardRenderer() {
    if(globalThis.html2canvas)return Promise.resolve(globalThis.html2canvas);
    if(!rendererPromise)rendererPromise=new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src=new URL('../vendor/html2canvas.min.js',import.meta.url).href;
        script.onload=()=>globalThis.html2canvas?resolve(globalThis.html2canvas):reject(new Error('Scorecard renderer is unavailable.'));
        script.onerror=()=>{script.remove();reject(new Error('Could not load the scorecard renderer. Please retry.'));};
        document.head.appendChild(script);
    }).catch(error=>{rendererPromise=null;throw error;});
    return rendererPromise;
}
export function preloadScorecardRenderer(){return loadScorecardRenderer().catch(()=>{});}
function status(message) {
    document.getElementById('scorecard-export-status').textContent=message;
    launchToastAlert(message);
}
function setBusy(value) {
    busy=value;
    document.getElementById('scorecard-copy-btn').disabled=value;
}
function captureScorecard() {
    const target=document.getElementById('screenshot-target-scorecard');
    const snapshot={html:target.innerHTML,className:target.className,width:target.getBoundingClientRect().width};
    if(!snapshot.width)return Promise.reject(new Error('Open your scorecard before exporting it.'));
    const key=snapshot.className+snapshot.width+snapshot.html;
    if(lastCapture?.key===key)return lastCapture.promise;
    const entry={key,promise:null};lastCapture=entry;
    entry.promise=(async()=>{
        const render=await loadScorecardRenderer();
        await document.fonts?.ready;
        const canvas=await render(target,{
            scale:2,backgroundColor:'#ffffff',logging:false,useCORS:true,
            onclone(doc) {
                const clone=doc.getElementById('screenshot-target-scorecard');
                clone.innerHTML=snapshot.html;clone.className=snapshot.className;clone.style.width=snapshot.width+'px';clone.style.boxSizing='border-box';
                for(let parent=clone;parent;parent=parent.parentElement)parent.classList.remove('hidden');
            }
        });
        const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
        if(!blob)throw new Error('Could not create the scorecard image.');
        return blob;
    })().catch(error=>{if(lastCapture===entry)lastCapture=null;throw error;});
    return entry.promise;
}
function saveBlob(blob) {
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.download='Quran_Quiz_Scorecard.png';link.href=url;
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function copyScreenshotToClipboard() {
    if(busy)return;setBusy(true);
    try {
        const image=captureScorecard();
        if(navigator.clipboard?.write&&typeof globalThis.ClipboardItem==='function') {
            let copied=false;
            try {
                // Begin the clipboard write during the click, before asynchronous image rendering.
                await navigator.clipboard.write([new ClipboardItem({'image/png':image})]);
                copied=true;
            } catch(error) {
                // Some browsers accept a Blob but reject promise-backed ClipboardItems.
                if(error.name==='TypeError')try {
                    await navigator.clipboard.write([new ClipboardItem({'image/png':await image})]);
                    copied=true;
                } catch {}
            }
            if(copied){status('Copied! Paste the image into WhatsApp or email for your teacher.');return;}
        }
        saveBlob(await image);
        status('Clipboard unavailable. Image saved—attach it in WhatsApp or email.');
    } catch(error){status(error.message);}
    finally {setBusy(false);}
}
