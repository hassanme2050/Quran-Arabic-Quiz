const STEP_POINTS=2,MIN_ADJUSTMENT=-12,MAX_ADJUSTMENT=12;
let adjustmentPoints=-2;

export function refreshArabicFontControls() {
    const disabled=document.getElementById('edit-arabic-field').disabled;
    document.getElementById('arabic-font-smaller').disabled=disabled||adjustmentPoints<=MIN_ADJUSTMENT;
    document.getElementById('arabic-font-larger').disabled=disabled||adjustmentPoints>=MAX_ADJUSTMENT;
}

export function changeArabicFontSize(direction) {
    direction=Number(direction);
    const field=document.getElementById('edit-arabic-field');
    if(field.disabled||![-1,1].includes(direction))return;
    adjustmentPoints=Math.max(MIN_ADJUSTMENT,Math.min(MAX_ADJUSTMENT,adjustmentPoints+direction*STEP_POINTS));
    field.style.setProperty('--arabic-font-adjustment',adjustmentPoints+'pt');
    refreshArabicFontControls();
}
