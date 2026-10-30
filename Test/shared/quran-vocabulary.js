// A reference's meaning label belongs to that reference, not to the next word.
export function parseQuranVocabulary(text){
    const records=[],warnings=[];let category=null,subcategory=null;
    String(text).replace(/^\uFEFF/,'').split(/\r\n|\n|\r/).forEach((line,index)=>{
        const value=line.trim();if(!value)return;
        const heading=value.match(/^[═─]+\s*༻\s*(.+?)\s*༺/);
        if(heading){const item={name:heading[1].trim()};if(value.startsWith('═')){category=item;subcategory=null;}else subcategory=item;return;}
        const split=value.indexOf('=');
        if(split<1){warnings.push('Unrecognized Book D line '+(index+1));return;}
        const word=value.slice(0,split).trim(),remaining=value.slice(split+1),arrow=remaining.indexOf('=>');
        const meaning=(arrow<0?remaining:remaining.slice(0,arrow)).trim();
        if(!word||!meaning)throw new Error('Missing word or meaning on Book D line '+(index+1));
        const references=arrow<0?[]:remaining.slice(arrow+2).split(',').map(part=>{
            const match=part.trim().match(/^(.+?)\s+(\d+)\s*:\s*(\d+)$/);
            if(!match)throw new Error('Invalid verse reference on Book D line '+(index+1)+': '+part.trim());
            const surah=Number(match[2]),ayah=Number(match[3]);
            if(!Number.isSafeInteger(surah)||surah<1||surah>114||!Number.isSafeInteger(ayah)||ayah<1)
                throw new Error('Invalid chapter/verse on Book D line '+(index+1));
            return {meaning:match[1].trim(),surah,ayah,key:surah+':'+ayah};
        });
        records.push({number:records.length+1,word,meaning,references,category,subcategory,sourceLine:index+1,language:'en',verified:true});
    });
    return {records,warnings};
}
