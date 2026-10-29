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

export function searchDictionary(items, query) {
    const raw = String(query ?? '').trim().toLowerCase();
    const key = normalizeSearch(raw);
    if (!key) return items;
    const arabicKey = ({laam:'ل', lam:'ل', illa:'الا'})[key] || key;
    function fieldRank(value, queryKey, numeric = false) {
        if (value == null) return Infinity;
        const text = normalizeSearch(value);
        if (String(value).trim().toLowerCase() === raw) return 0;
        if (text === queryKey || (numeric && /^\d+$/.test(queryKey) && Number(text) === Number(queryKey))) return 1;
        if (text.startsWith(queryKey)) return 2;
        if (text.split(/[^\p{L}\p{N}]+/u).includes(queryKey)) return 3;
        if (text.includes(queryKey)) return text.endsWith(queryKey) ? 5 : 4;
        if (!numeric && text.split(/\s+/).some(word => near(queryKey, word))) return 6;
        return Infinity;
    }
    return items.map((item, order) => {
        const number = item.number ?? (item.originalIndex == null ? null : item.originalIndex + 1);
        const rank = Math.min(fieldRank(item.word, arabicKey), fieldRank(item.meaning, key),
            /^\d+$/.test(key) ? fieldRank(number, key, true) : Infinity,
            normalizeSearch(item.explanation).includes(key) ? 7 : Infinity);
        return {item, order:item.originalIndex ?? order, rank};
    }).filter(hit => Number.isFinite(hit.rank)).sort((a,b) => a.rank-b.rank || a.order-b.order).map(hit => hit.item);
}

// Browser/OS input hints: native keyboard language is chosen by the device.
export function configureSearchKeyboard(input, language) {
    input.lang = language === 'number' ? 'en' : language;
    input.dir = language === 'ar' || language === 'ur' ? 'rtl' : 'ltr';
    input.inputMode = 'text';
    input.placeholder = 'Search...';
    input.setAttribute('aria-label', 'Search Arabic, meanings or word numbers');
}
