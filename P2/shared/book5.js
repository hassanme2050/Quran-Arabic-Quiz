export const BOOK5_LEVELS = Object.freeze([
  { id: 1, label: 'KG - Grade 3' }, { id: 2, label: 'Grades 4 - 6' },
  { id: 3, label: 'Grades 7 - 8' }, { id: 4, label: 'Grades 9 - 10' }
]);
export function parseBook5Records(text) {
  const records = [], warnings = []; let level = null, levelLabel = '';
  String(text).split(/\r?\n/).forEach((line, index) => {
    const heading = line.match(/LEVEL\s+([1-4])\s*\|\s*(.*?)\s*༺/);
    if (heading) { level = Number(heading[1]); levelLabel = heading[2].trim(); return; }
    const record = line.match(/^\s*(\d+)\)\s*(.*?)\s*=\s*(.*?)\s*$/);
    if (!record) { if (line.trim()) warnings.push('Ignored line ' + (index + 1) + '.'); return; }
    if (!level) { warnings.push('Word on line ' + (index + 1) + ' has no level heading.'); return; }
    const word = record[2].trim(), meaning = record[3].trim();
    if (word && meaning) records.push({ number:Number(record[1]), word, meaning, level, levelLabel });
    else warnings.push('Incomplete word on line ' + (index + 1) + '.');
  });
  return { records, warnings };
}
export function normalizeArabicAnswer(value) {
  return String(value ?? '').normalize('NFC').replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').replace(/\s+/g, ' ').trim();
}
