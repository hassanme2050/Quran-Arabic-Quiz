const STEP_POINTS=2,MIN_ADJUSTMENT=-12,MAX_ADJUSTMENT=12;
let adjustmentPoints=-2;

function textSpace(field) {
    const style=getComputedStyle(field);
    const font=parseFloat(style.fontSize);
    const lineHeight=parseFloat(style.lineHeight)/font;
    const available=field.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
    return {font,max:available/lineHeight};
}

export function refreshArabicFontControls() {
    const field=document.getElementById('edit-arabic-field');
    const smaller=document.getElementById('arabic-font-smaller'),larger=document.getElementById('arabic-font-larger');
    if(field.disabled){smaller.disabled=true;larger.disabled=true;return;}
    let space=textSpace(field);
    // After a viewport change, keep the complete Arabic line inside the fixed box.
    while(space.font>space.max+.05 && adjustmentPoints>MIN_ADJUSTMENT) {
        adjustmentPoints-=STEP_POINTS;
        field.style.setProperty('--arabic-font-adjustment',adjustmentPoints+'pt');
        space=textSpace(field);
    }
    smaller.disabled=adjustmentPoints<=MIN_ADJUSTMENT;
    larger.disabled=adjustmentPoints>=MAX_ADJUSTMENT||space.font+STEP_POINTS*96/72>space.max+.05;
}

export function changeArabicFontSize(direction) {
    direction=Number(direction);
    const field=document.getElementById('edit-arabic-field');
    if(field.disabled||![-1,1].includes(direction))return;
    refreshArabicFontControls();
    if(document.getElementById(direction<0?'arabic-font-smaller':'arabic-font-larger').disabled)return;
    adjustmentPoints=Math.max(MIN_ADJUSTMENT,Math.min(MAX_ADJUSTMENT,adjustmentPoints+direction*STEP_POINTS));
    field.style.setProperty('--arabic-font-adjustment',adjustmentPoints+'pt');
    refreshArabicFontControls();
}
