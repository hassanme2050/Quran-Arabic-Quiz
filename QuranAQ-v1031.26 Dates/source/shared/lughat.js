// Parse the source as written; never rewrite or normalize its Unicode text.
export function parseLughatBook(text) {
    const lines = String(text).replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
    const hasBoundary = lines.some(line => /^\s*-{5,}(?:\s.*)?$/.test(line));
    const records = [], warnings = [], seen = new Set();
    let verified = hasBoundary, boundaryCount = 0, juzz = null, surah = null;
    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (/^-{5,}(?:\s.*)?$/.test(trimmed)) { verified = false; boundaryCount++; return; }
        const heading = trimmed.match(/\u0F3B\s*(\d+)\s+(.+?)\s*\u0F3A/);
        if (heading) {
            const value = {number:Number(heading[1]), name:heading[2].trim()};
            if (/\u062C\u0632\u0621|\u067E\u0627\u0631\u06C1/.test(value.name)) juzz = value;
            else if (/\u0633\u0648\u0631/.test(value.name)) surah = value;
            else warnings.push('Unknown heading on line ' + (index + 1));
            return;
        }
        const match = trimmed.match(/^(\d{4})\s+(.+?)\s*\u27F5\s*(.+)$/);
        if (!match) { warnings.push('Unrecognized line ' + (index + 1)); return; }
        const number = Number(match[1]);
        if (!number) throw new Error('Invalid Book B word number: ' + match[1]);
        if (seen.has(number)) warnings.push('Duplicate Book B word number ' + match[1] + ' on line ' + (index + 1));
        seen.add(number);
        const rawMeaning = match[3].trim();
        const note = rawMeaning.match(/\s*(\([^()]*\)(?:\s*\([^()]*\))*)\s*$/);
        const meaning = note ? rawMeaning.slice(0, note.index).trim() : rawMeaning;
        if (!meaning) throw new Error('Missing Urdu meaning at word ' + match[1]);
        records.push({number, word:match[2].trim(), meaning, explanation:note ? note[1] : '', rawMeaning,
            juzz, surah, verified, language:'ur', sourceLine:index + 1});
    });
    if (!hasBoundary) warnings.push('No verification boundary found; all Book B words are dictionary-only.');
    if (boundaryCount > 1) warnings.push('Multiple verification boundaries found; words after the first remain unverified.');
    return {records, warnings, hasBoundary};
}
