import { launchToastAlert } from './ui.js';
// The browser adapter can be replaced by Android/iOS clipboard and sharing adapters.
let rendererPromise;
function loadScorecardRenderer() {
    if (globalThis.html2canvas) return Promise.resolve(globalThis.html2canvas);
    if (!rendererPromise) {
        rendererPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            // Fetch this optional dependency only when exporting a scorecard.
            script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
            script.onload = () => {
                if (globalThis.html2canvas) resolve(globalThis.html2canvas);
                else reject(new Error('Scorecard renderer is unavailable.'));
            };
            script.onerror = () => { script.remove(); reject(new Error('Could not load scorecard renderer. Check your connection and retry.')); };
            document.head.appendChild(script);
        }).catch(error => { rendererPromise = null; throw error; });
    }
    return rendererPromise;
}
export async function copyScreenshotToClipboard() {
    try {
        const render = await loadScorecardRenderer();
        const canvas = await render(document.getElementById('screenshot-target-scorecard'), {
            scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true
        });
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Could not render the scorecard image.');
        try {
            await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            launchToastAlert('📸 Scorecard copied! Paste it into your chat.');
        } catch {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = 'Quiz_Scorecard.png';
            link.href = url;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            launchToastAlert('📥 Clipboard restricted. Scorecard saved as download!');
        }
    } catch (error) {
        console.error(error);
        launchToastAlert('⚠️ ' + error.message);
    }
}
