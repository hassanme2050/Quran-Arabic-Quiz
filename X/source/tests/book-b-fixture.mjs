// Test a chosen cutoff without changing the user's actual vocabulary file.
export function withVerificationAt(text,number) {
    const newline=text.match(/\r\n|\n|\r/)?.[0]||'\n';
    const lines=text.split(/\r\n|\n|\r/).filter(line=>!/^\s*-{5,}(?:\s.*)?$/.test(line));
    const target=lines.findIndex(line=>Number(line.match(/^\uFEFF?\s*(\d{4})\s/)?.[1])===number);
    if(target<0)throw new Error('Fixture word is missing: '+number);
    lines.splice(target+1,0,'-----');return lines.join(newline);
}
