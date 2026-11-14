// Compare spelling without vowel/recitation marks or an optional definite article.
// Preserve hamza, taa marbuta and alif maqsura: those are spelling, not harakat.
export function normalizeArabicAnswer(value) {
    return String(value ?? '').normalize('NFKC')
        .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0640]/g, '')
        .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
        .replace(/[آٱ]/g, 'ا')
        .replace(/ی/g, 'ي').replace(/ک/g, 'ك').replace(/ہ/g, 'ه').replace(/ۃ/g, 'ة')
        .replace(/[.…]+/g, ' ')
        .replace(/\s+/g, ' ').trim();
}
function isArabic(value) {
    return /\p{Letter}/u.test(value) && /^[\p{Script_Extensions=Arabic}\s]+$/u.test(value);
}
function withoutArticle(value) {
    return value.split(' ').map(word => word.replace(/^ال(?=.)/, '')).join(' ');
}
function answerVariants(expected) {
    const variants = [];
    for (const part of String(expected).split(/[/,،;؛]/)) {
        // Parentheses in the books may contain an alternate form or an explanation.
        for (const match of part.matchAll(/\(([^()]*)\)/g)) {
            if (isArabic(normalizeArabicAnswer(match[1]))) variants.push(match[1]);
        }
        variants.push(part.replace(/\([^()]*\)/g, '').trim());
    }
    return variants.map(normalizeArabicAnswer).filter(isArabic);
}
export function arabicAnswersMatch(answer, expected) {
    const typed = normalizeArabicAnswer(answer);
    if (!isArabic(typed)) return false;
    const key = withoutArticle(typed);
    return answerVariants(expected).some(value => withoutArticle(value) === key);
}
export function spellingEntries(records, book) {
    return records.flatMap(record => {
        if (record.verified === false) return [];
        let prompt = record.meaning, answer = record.word;
        if (book === 'book_c') {
            // Only bilingual answers provide a meaning-to-Arabic spelling pair.
            const pair = record.meaning.match(/^([^,،]+)[,،]\s*(.+)$/u);
            if (!pair || !isArabic(normalizeArabicAnswer(pair[1])) || !/[A-Za-z]/.test(pair[2])) return [];
            answer = pair[1].trim();
            prompt = pair[2].trim();
            // A bilingual label such as 'Makhraj (Articulation point)' should
            // show its meaning, without giving away the Arabic pronunciation.
            const meaning = prompt.match(/\(([^()]+)\)/);
            if (meaning) prompt = meaning[1].trim();
        }
        if (book === 'book_b') prompt = prompt.replace(/\(\s*\p{Script_Extensions=Arabic}(?:\s+\p{Script_Extensions=Arabic}){1,4}\s*\)/gu, '').trim();
        if (!prompt?.trim() || !answerVariants(answer).length) return [];
        return [{...record, spellingPrompt: prompt, spellingAnswer: answer}];
    });
}
