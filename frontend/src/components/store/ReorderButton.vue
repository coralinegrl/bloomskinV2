<template><div class="reorder"><button type="button" :disabled="busy" @click="reorder"><RotateCcw :size="17"/> {{ busy ? 'Revisando disponibilidad…' : 'Volver a comprar' }}</button><p v-if="message" role="status">{{ message }}</p></div></template>
<script setup>
import {ref} from 'vue'
import {RotateCcw} from 'lucide-vue-next'
import {productosApi} from '../../api/index.js'
import {useCartStore} from '../../stores/cart.js'
import {variantDisplay} from '../../utils/productVariants.js'
const props=defineProps({items:{type:Array,default:()=>[]}}),cart=useCartStore(),busy=ref(false),message=ref('')
async function reorder(){busy.value=true;message.value='';try{
  const requests=await Promise.allSettled(props.items.map(async item=>({item,product:(await productosApi.obtener(item.producto_id)).data})))
  let added=0,missing=0
  for(const result of requests){if(result.status!=='fulfilled'){missing++;continue}const {item,product}=result.value,tone=item.tono_seleccionado || '';
    if(product.usa_tonos && !(product.tonos || []).includes(tone)){missing++;continue}
    const available=product.usa_tonos ? Number(product.tonos_stock?.[tone] || 0) : Number(product.stock || 0)
    const existing=cart.items.find(i=>i.cart_key===`${product.id}::${tone}`),current=Number(existing?.cantidad || 0)
    const quantity=Math.max(0,Math.min(Number(item.cantidad || 1),available-current,99-current))
    if(quantity<Number(item.cantidad || 1))missing++
    const payload={...variantDisplay(product,tone),stock:available,tono_seleccionado:tone || null}
    for(let i=0;i<quantity;i++){cart.agregar(payload);added++}
  }
  message.value=added ? `Agregamos ${added} unidad(es) con el precio actual.${missing ? ' Algunos productos ya no están disponibles o tienen menos stock.' : ''}` : 'No hay unidades disponibles para agregar de este pedido.'
  if(added)cart.openDrawer()
}catch{message.value='No pudimos revisar la disponibilidad. Intenta nuevamente.'}finally{busy.value=false}}
</script>
<style scoped>.reorder{margin:20px 0}.reorder button{display:inline-flex;align-items:center;gap:9px;background:#bf547a;color:white;border:0;border-radius:6px;min-height:46px;padding:12px 16px;font:inherit;font-size:14px;cursor:pointer}.reorder button:disabled{opacity:.5}.reorder p{font-size:14px;line-height:1.6;margin:12px 0 0}</style>
