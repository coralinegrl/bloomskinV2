function validatePublication(input) {
  function invalid(message){const error=new Error(message);error.code='INVALID_PUBLICATION';throw error;}
  if(!String(input.nombre || '').trim())invalid('Escribe el nombre del producto.');
  if(input.publication_status!==undefined && !['draft','published'].includes(input.publication_status))invalid('El estado de publicación no es válido.');
  const price=Number(input.precio_clp ?? 0);
  if(!Number.isSafeInteger(price) || price<0 || price>10000000)invalid('El precio debe ser un entero en CLP entre 0 y 10.000.000.');
  if(input.publication_status==='published' && (!String(input.marca || '').trim() || !String(input.categoria || '').trim() || !String(input.imagen_url || '').trim() || price<1))invalid('Para publicar, completa marca, nombre, categoría, foto y precio.');
  const amounts=input.usa_tonos ? Object.values(input.tonos_stock || {}) : [input.stock ?? 0];
  if(amounts.some(value=>!Number.isSafeInteger(Number(value)) || Number(value)<0 || Number(value)>1000000))invalid('El stock debe ser un entero entre 0 y 1.000.000.');
}
module.exports={validatePublication};
