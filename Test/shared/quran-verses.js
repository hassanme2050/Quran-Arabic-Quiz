// Public Al Quran Cloud text editions. Never substitute another ayah on failure.
export const QURAN_VERSE_SOURCE='https://alquran.cloud/api';
export function parseVerseResponse(payload,reference){
    const editions=payload?.code===200&&Array.isArray(payload.data)?payload.data:[];
    const arabic=editions.find(item=>item.edition?.identifier==='quran-uthmani');
    const english=editions.find(item=>item.edition?.identifier==='en.sahih');
    if(!arabic||!english||[arabic,english].some(item=>item.surah?.number!==reference.surah||item.numberInSurah!==reference.ayah||typeof item.text!=='string'||!item.text.trim()))
        throw new Error('The verse service did not return the requested Arabic ayah and English translation.');
    return {key:reference.key,arabic:arabic.text,english:english.text,surahName:arabic.surah.englishName||'',translation:english.edition.englishName||'Saheeh International'};
}
export function createVerseLoader(fetcher=(...args)=>fetch(...args)){
    const cache=new Map();
    return async(reference,{signal}={})=>{
        const key=reference.surah+':'+reference.ayah;
        if(cache.has(key))return cache.get(key);
        let lastError;
        for(const origin of ['https://api.alquran.cloud','https://alquran.api.islamic.network']){
            try{
                const response=await fetcher(origin+'/v1/ayah/'+key+'/editions/quran-uthmani,en.sahih',{signal});
                if(!response.ok)throw new Error('Verse service returned '+response.status+'.');
                const verse=parseVerseResponse(await response.json(),{...reference,key});
                if(signal?.aborted)throw new DOMException('Aborted','AbortError');
                cache.set(key,verse);return verse;
            }catch(error){if(signal?.aborted||error.name==='AbortError')throw error;lastError=error;}
        }
        throw lastError||new Error('The verse service is unavailable.');
    };
}
export const loadQuranVerse=createVerseLoader();
