<template>
  <section class="daily-work" aria-labelledby="daily-title">
    <div class="daily-heading"><div><h2 id="daily-title">Tu día en Bloomskin</h2><p>{{ pending.length ? 'Estos pedidos necesitan tu atención.' : 'Tus pedidos están al día.' }}</p></div><button type="button" @click="$emit('catalog')"><Plus :size="18"/> Nuevo producto</button></div>
    <div class="daily-counts">
      <button v-for="item in groups" :key="item.key" :class="{active:filter===item.key}" type="button" @click="filter=item.key"><component :is="item.icon" :size="20"/><strong>{{ item.count }}</strong><span>{{ item.label }}</span></button>
      <button type="button" @click="$emit('inventory')"><PackageSearch :size="20"/><strong>{{ lowStock }}</strong><span>Por reponer</span></button>
    </div>
    <p v-if="!visible.length" class="daily-empty">No hay pedidos en esta etapa.</p>
    <div v-else class="daily-list">
      <button v-for="order in visible" :key="order.id" class="daily-order" type="button" @click="$emit('order',order.id)"><div><strong>{{ order.codigo }}</strong><span>{{ order.cliente_nombre }}</span><small>{{ order.metodo_envio==='store_pickup' ? 'Retiro' : 'Despacho' }} · {{ date(order.creado_en) }}</small></div><div class="daily-order-action"><span>{{ action(order) }}</span><ArrowRight :size="18"/></div></button>
    </div>
  </section>
</template>
<script setup>
import {computed,ref} from 'vue'
import {Plus,PackageSearch,ReceiptText,PackageCheck,Truck,ArrowRight} from 'lucide-vue-next'
const props=defineProps({orders:{type:Array,default:()=>[]},products:{type:Array,default:()=>[]},threshold:{type:Number,default:3}})
defineEmits(['order','inventory','catalog'])
const filter=ref('all')
const pending=computed(()=>props.orders.filter(p=>['payment_submitted','paid','shipped'].includes(p.estado)))
const groups=computed(()=>[
  {key:'all',label:'Pendientes',count:pending.value.length,icon:PackageCheck},
  {key:'payment_submitted',label:'Revisar pago',count:pending.value.filter(p=>p.estado==='payment_submitted').length,icon:ReceiptText},
  {key:'paid',label:'Por preparar',count:pending.value.filter(p=>p.estado==='paid').length,icon:PackageCheck},
  {key:'shipped',label:'Por entregar',count:pending.value.filter(p=>p.estado==='shipped').length,icon:Truck},
])
const lowStock=computed(()=>props.products.filter(p=>p.activo!==false && p.publication_status!=='draft').reduce((count,p)=>count+(p.usa_tonos ? (p.tonos || []).filter(t=>Number(p.tonos_stock?.[t] || 0)<=props.threshold).length : Number(p.stock)<=props.threshold ? 1 : 0),0))
const visible=computed(()=>pending.value.filter(p=>filter.value==='all' || p.estado===filter.value).sort((a,b)=>new Date(a.creado_en)-new Date(b.creado_en)))
const action=p=>p.estado==='payment_submitted' ? 'Revisar' : p.estado==='paid' ? 'Preparar' : 'Ver entrega'
const date=value=>value ? new Date(value).toLocaleDateString('es-CL') : ''
</script>
<style scoped>
.daily-heading h2{color:var(--ad-text)}
.daily-work{margin-bottom:28px;border-bottom:1px solid var(--ad-border);padding-bottom:28px}.daily-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px}.daily-heading h2{font-size:22px;margin:0 0 8px}.daily-heading p,.daily-empty{font-size:14px;color:var(--ad-muted)}button{font:inherit;cursor:pointer;color:var(--ad-text)}.daily-heading>button{display:flex;align-items:center;gap:8px;background:var(--ad-surface);border:1px solid var(--ad-border);border-radius:6px;padding:12px}.daily-counts{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}.daily-counts button{display:grid;grid-template-columns:22px 1fr;gap:8px;text-align:left;background:transparent;border:1px solid var(--ad-border);padding:14px;border-radius:6px;min-height:92px}.daily-counts strong{text-align:right;font-size:24px;line-height:1}.daily-counts span{grid-column:1/-1;font-size:14px;overflow-wrap:anywhere}.daily-counts button.active{border-color:#d4779d;background:#d4779d18}.daily-list{margin-top:18px}.daily-order{display:flex;justify-content:space-between;gap:16px;width:100%;background:transparent;border:0;border-bottom:1px solid var(--ad-border);padding:16px 0;text-align:left;min-height:84px}.daily-order>div:first-child{display:grid;gap:6px;min-width:0;overflow-wrap:anywhere}.daily-order small{color:var(--ad-muted)}.daily-order-action{display:flex;align-items:center;gap:8px;color:#edabc8;font-size:14px;flex-shrink:0}@media(max-width:720px){.daily-counts{grid-template-columns:repeat(2,minmax(0,1fr))}.daily-counts button:first-child{grid-column:1/-1;min-height:76px}.daily-heading{align-items:flex-start}.daily-heading>button{font-size:14px;flex-shrink:0}.daily-heading h2{font-size:20px}.daily-order-action span{max-width:80px}.daily-heading{flex-wrap:wrap}}
</style>
