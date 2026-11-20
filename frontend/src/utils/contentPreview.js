export const isContentPreview=new URLSearchParams(window.location.search).get('preview')==='1' && Boolean(sessionStorage.getItem('bs_content_preview'))
export function openContentPreview(settings, target, route='/') {
  const tab=target || window.open('about:blank','_blank')
  if(!tab) throw new Error('Permite abrir pestañas para ver la vista previa.')
  tab.sessionStorage.setItem('bs_content_preview',JSON.stringify(settings))
  tab.opener=null
  tab.location.replace(`${route}?preview=1`)
}
