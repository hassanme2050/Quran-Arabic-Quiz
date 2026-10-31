// Keep question text, bilingual answer text and heading metadata exactly as authored.
const answerKey=value=>value.trim().replace(/\s+/g,' ').toLocaleLowerCase('en');
export function validateTajweedQuestion(record) {
    const values=[record.word,record.meaning,...(record.wrongAnswers||[])];
    if(record.wrongAnswers?.length!==6||values.some(value=>typeof value!=='string'||!value.trim()||/[\r\n\u27F6\u27F9]/.test(value))||record.wrongAnswers.some(value=>/\s+-\s+/.test(value)))
        throw new Error('Enter a question, one correct answer and exactly six wrong answers, each on one line without source separators.');
    if(new Set([record.meaning,...record.wrongAnswers].map(answerKey)).size!==7)
        throw new Error('The correct answer and six wrong answers must all be different.');
}
export function parseTajweedBook(text) {
    const records=[],warnings=[],seen=new Set();let category=null,subcategory=null,boundaryCount=0;
    const lines=String(text).replace(/^\uFEFF/,'').split(/\r\n|\n|\r/),marker=line=>/^\s*-{5,}(?:\s.*)?$/.test(line);
    const hasBoundary=lines.some(marker);let verified=hasBoundary;
    lines.forEach((line,index)=>{
        const value=line.trim();if(!value)return;
        if(marker(value)){verified=false;boundaryCount++;return;}
        const heading=value.match(/^[═─]+\s*༻\s*(\d+)\s+(.+?)\s*༺/);
        if(heading){
            const item={number:Number(heading[1]),name:heading[2].trim()};
            if(value.startsWith('═')){category=item;subcategory=null;}else subcategory=item;
            return;
        }
        const match=value.match(/^(\d+)\)\s*(.*?)\s*⟶\s*(.*?)\s*⟹\s*(.*?)\s*$/);
        if(!match){if(/^\d+\)/.test(value))throw new Error('Invalid Tajweed question on line '+(index+1));warnings.push('Unrecognized Tajweed line '+(index+1));return;}
        const number=Number(match[1]);
        if(!Number.isSafeInteger(number)||number<1||seen.has(number))throw new Error('Invalid or duplicate Tajweed question number '+match[1]);
        const record={number,word:match[2].trim(),meaning:match[3].trim(),wrongAnswers:match[4].split(/\s+-\s+/).map(answer=>answer.trim()),category,subcategory,sourceLine:index+1,language:'en',verified};
        try{validateTajweedQuestion(record);}catch(error){throw new Error('Tajweed question '+number+': '+error.message);}
        records.push(record);seen.add(number);
    });
    if(!hasBoundary)warnings.push('No verification boundary found; all Tajweed questions are dictionary-only.');
    if(boundaryCount>1)warnings.push('Multiple verification boundaries found; questions after the first remain unverified.');
    return {records,warnings,hasBoundary};
}
export function tajweedContext(record) {
    return [record?.category,record?.subcategory].filter(Boolean).map(item=>item.name).join(' › ');
}
export function renderTajweedContext(element,record){
    element.replaceChildren();
    for(const [key,tag] of [['category','strong'],['subcategory','span']])if(record?.[key]){
        const line=document.createElement(tag);line.textContent=record[key].name;element.appendChild(line);
    }
    element.classList.toggle('hidden',!element.textContent);
}
export function tajweedReviewAnswer(answer){
    return /[\u0600-\u06ff]/.test(answer)&&/[A-Za-z]/.test(answer)?answer.replace(/[,،]\s*/, '\n'):answer;
}
export function tajweedChoices(record,random=Math.random) {
    validateTajweedQuestion(record);
    const shuffle=items=>{for(let i=items.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;};
    const answers=[record.meaning,...shuffle([...record.wrongAnswers]).slice(0,3)];
    return shuffle(answers).map(meaning=>({word:record.word,meaning}));
}
