// Search only: displayed source words, numbering and quiz answers stay intact.
export function normalizeSearch(value) {
    return String(value ?? '').normalize('NFKD').toLowerCase()
        .replace(/\p{M}/gu, '').replace(/[ـ\u200c\u200d]/g, '')
        .replace(/[أإآٱ]/g, 'ا').replace(/[ىی]/g, 'ي').replace(/ک/g, 'ك')
        .replace(/[٠-٩۰-۹]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.includes(digit) ? '٠١٢٣٤٥٦٧٨٩'.indexOf(digit) : '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
        .replace(/\s+/g, ' ').trim();
}

function near(a, b) {
    if (a.length < 3 || Math.abs(a.length - b.length) > 1) return false;
    let previous = Array.from({length:b.length + 1}, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const row = [i];
        for (let j = 1; j <= b.length; j++) row[j] = Math.min(row[j-1]+1, previous[j]+1, previous[j-1]+(a[i-1] === b[j-1] ? 0 : 1));
        previous = row;
    }
    return previous[b.length] <= 1;
}

export function searchDictionary(items, query, mode) {
    const raw = String(query ?? '').trim().toLowerCase();
    let key = normalizeSearch(raw);
    if (!key) return items;
    if (mode === 'arabic') key = ({laam:'ل', lam:'ل', illa:'الا'})[key] || key;
    return items.map((item, order) => {
        const value = mode === 'number' ? String(item.number ?? item.originalIndex + 1) : mode === 'arabic' ? item.word : item.meaning;
        const text = normalizeSearch(value);
        let rank = Infinity;
        if (String(value).trim().toLowerCase() === raw) rank = 0;
        else if (text === key || (mode === 'number' && /^\d+$/.test(key) && Number(text) === Number(key))) rank = 1;
        else if (text.startsWith(key)) rank = 2;
        else if (text.split(/[^\p{L}\p{N}]+/u).includes(key)) rank = 3;
        else if (text.includes(key)) rank = text.endsWith(key) ? 5 : 4;
        else if (mode !== 'number' && text.split(/\s+/).some(word => near(key, word))) rank = 6;
        else if (mode === 'english' && normalizeSearch(item.explanation).includes(key)) rank = 7;
        return {item, order, rank};
    }).filter(hit => Number.isFinite(hit.rank)).sort((a,b) => a.rank-b.rank || a.order-b.order).map(hit => hit.item);
}

const layouts = {
    ar: ['ض ص ث ق ف غ ع ه خ ح ج د', 'ش س ي ب ل ا ت ن م ك ط', 'ئ ء ؤ ر لا ى ة و ز ظ', 'أ إ آ ٱ َ ِ ُ ّ ْ ً ٍ ٌ'],
    ur: ['ق و ع ر ت ے ء ی ہ پ', 'ا س د ف گ ھ ج ک ل', 'ز ش چ ط ب ن م ں ح خ', 'ٹ ڈ ڑ ژ ث ص ض ذ ظ غ ؤ ئ'],
    en: ['q w e r t y u i o p', 'a s d f g h j k l', 'z x c v b n m']
};

export function configureSearchKeyboard(input, keyboard, language, onInput) {
    input.lang = language;
    input.dir = language === 'ar' || language === 'ur' ? 'rtl' : 'ltr';
    input.inputMode = 'text';
    input.placeholder = language === 'ar' ? 'ابحث…' : language === 'ur' ? 'تلاش کریں…' : language === 'number' ? 'Word number…' : 'Search…';
    input.setAttribute('aria-label', language === 'number' ? 'Search by word number' : 'Live dictionary search');
    keyboard.replaceChildren();
    keyboard.classList.add('hidden');
    if (language === 'number') return;
    keyboard.setAttribute('aria-label', {ar:'Arabic',ur:'Urdu',en:'English'}[language] + ' keyboard');
    function keyButton(label, action, row) {
        const button = document.createElement('button');
        button.type = 'button'; button.textContent = label;
        button.addEventListener('pointerdown', event => event.preventDefault());
        button.addEventListener('click', action);
        row.appendChild(button);
    }
    function insert(text, erase = false) {
        const start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? start;
        const from = erase && start === end ? Math.max(0, start - 1) : start;
        input.setRangeText(text, from, end, 'end');
        input.focus(); onInput();
    }
    for (const letters of layouts[language]) {
        const row = document.createElement('div'); row.className = 'dictionary-keyboard-row';
        for (const letter of letters.split(' ')) keyButton(letter, () => insert(letter), row);
        keyboard.appendChild(row);
    }
    const tools = document.createElement('div'); tools.className = 'dictionary-keyboard-row keyboard-tools';
    keyButton('Space', () => insert(' '), tools);
    keyButton('⌫', () => insert('', true), tools);
    keyButton('Clear', () => { input.value = ''; input.focus(); onInput(); }, tools);
    keyButton('Hide', () => { keyboard.classList.add('hidden'); input.blur(); }, tools);
    keyboard.appendChild(tools);
}
