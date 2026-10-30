// Keep the original HEX encoding: sorted book numbers, each padded to 3 decimal digits.
export const GENERATOR_QUESTION_COUNT = 20;
export const SUPPORTED_QUESTION_COUNTS = Object.freeze([10, 20]);
const MAX_BOOK_NUMBER = 999;
export function encodeQuizCode(numbers, bookId = 'book_a') {
    if (['book_b','book_d'].includes(bookId)) {
        if (!Array.isArray(numbers) || !SUPPORTED_QUESTION_COUNTS.includes(numbers.length) || new Set(numbers).size !== numbers.length || numbers.some(n => !Number.isInteger(n) || n < 1 || n > 9999)) throw new Error('Select 10 or 20 distinct Book B word numbers.');
        return (bookId==='book_d'?'D4:':'B2:') + [...numbers].sort((a,b)=>a-b).map(n=>String(n).padStart(4,'0')).join('.');
    }
    if (bookId !== 'book_a') throw new Error('Unknown book.');
    if (!Array.isArray(numbers) || !SUPPORTED_QUESTION_COUNTS.includes(numbers.length) ||
        new Set(numbers).size !== numbers.length ||
        numbers.some(number => !Number.isInteger(number) || number < 1 || number > MAX_BOOK_NUMBER)) {
        throw new Error('Select 10 or 20 distinct book numbers between 1 and 999.');
    }
    const sequence = [...numbers].sort((a,b) => a-b).map(number => String(number).padStart(3,'0')).join('');
    return BigInt(sequence).toString(16).toUpperCase();
}
export function decodeTeacherQuizCode(code) {
    if (typeof code === 'string' && /^(B2|D4):/i.test(code)) {
        if (!/^(B2|D4):\d{4}(?:\.\d{4}){9}(?:(?:\.\d{4}){10})?$/i.test(code)) return null;
        const numbers = code.slice(3).split('.').map(Number);
        return numbers.every(n=>n > 0) && new Set(numbers).size === numbers.length ? numbers : null;
    }
    if (typeof code !== 'string' || !/^[0-9A-F]+$/i.test(code) || code.length > 50) return null;
    try {
        const decimal = BigInt('0x' + code).toString(10);
        // A positive first 3-digit book number loses at most 2 leading zeros.
        const count = decimal.length <= 30 ? 10 : 20;
        if (decimal.length > count * 3) return null;
        const sequence = decimal.padStart(count * 3, '0');
        const numbers = [];
        for (let index = 0; index < sequence.length; index += 3) {
            const number = Number(sequence.slice(index, index + 3));
            if (number < 1 || number > MAX_BOOK_NUMBER) return null;
            numbers.push(number);
        }
        if (new Set(numbers).size !== count) return null;
        return numbers;
    } catch { return null; }
}
