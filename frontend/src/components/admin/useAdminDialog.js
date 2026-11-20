import {nextTick,onBeforeUnmount,watch} from 'vue'
export function useAdminDialog(active,close){
  let previousFocus,previousOverflow=''
  function keydown(event){
    if(event.key==='Escape'){event.preventDefault();close();return}
    if(event.key!=='Tab')return
    const controls=[...document.querySelectorAll('.work-dialog button:not(:disabled),.work-dialog input:not(:disabled),.work-dialog select:not(:disabled),.work-dialog textarea:not(:disabled),.work-dialog a[href]')].filter(el=>el.getClientRects().length)
    const first=controls[0],last=controls.at(-1)
    if(!first)return
    if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus()}
    else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus()}
  }
  function cleanup(){window.removeEventListener('keydown',keydown);document.body.style.overflow=previousOverflow}
  watch(active,async value=>{if(value){previousFocus=document.activeElement;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';window.addEventListener('keydown',keydown);await nextTick();document.querySelector('.work-dialog button')?.focus({preventScroll:true})}else{cleanup();previousFocus?.isConnected&&previousFocus.focus({preventScroll:true})}})
  onBeforeUnmount(()=>{if(active.value)cleanup()})
}
