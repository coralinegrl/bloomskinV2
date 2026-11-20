<template>
  <section class="management-work fulfillment" v-if="['paid','shipped','delivered'].includes(order.estado)">
    <h3>Preparar y entregar</h3><p v-if="loading" role="status">Cargando preparación…</p><p v-if="error" class="work-error" role="alert">{{ error }}</p><p v-if="success" role="status">{{ success }}</p>
    <button v-if="!loading && !loaded" type="button" @click="load">Volver a cargar preparación</button>
    <template v-if="!loading && loaded"><div class="packing-list"><label v-for="item in order.items || []" :key="key(item)"><input v-model="form.checked" :value="key(item)" type="checkbox" :disabled="busy"><span><strong>{{ item.cantidad }} × {{ item.producto_nombre || item.nombre }}</strong><small v-if="item.tono_seleccionado">{{ item.tono_seleccionado }}</small></span></label></div><p>{{ form.checked.length }} de {{ (order.items || []).length }} productos preparados</p>
    <div class="fulfillment-actions"><button type="button" @click="copyAddress"><Copy :size="16"/> Copiar dirección</button><a v-if="phone" :href="`https://wa.me/${phone}`" target="_blank" rel="noopener"><MessageCircle :size="16"/> Contactar</a></div>
    <template v-if="order.metodo_envio!=='store_pickup'"><div class="work-grid"><label>Transportista<input v-model.trim="form.carrier" maxlength="80"></label><label>Número de seguimiento<input v-model.trim="form.tracking_number" maxlength="100"></label></div><label>Enlace de seguimiento<input v-model.trim="form.tracking_url" type="url" placeholder="https://..." maxlength="1200"></label></template><label>Nota interna<textarea v-model.trim="form.admin_note" rows="3" maxlength="1000"></textarea></label><div class="fulfillment-actions"><button type="button" :disabled="busy" @click="save(false)"><Save :size="18"/> Guardar preparación</button><button v-if="order.estado==='paid'" class="work-primary" type="button" :disabled="busy || !allChecked" @click="save(true)"><PackageCheck :size="18"/> {{ order.metodo_envio==='store_pickup' ? 'Listo para retiro' : 'Marcar despachado' }}</button></div></template>
  </section>
</template>
<script setup>
import {computed,ref,watch} from 'vue'
import {Copy,MessageCircle,Save,PackageCheck} from 'lucide-vue-next'
import {managementApi,pedidosApi} from '../../api/index.js'
const props=defineProps({order:{type:Object,required:true}}),emit=defineEmits(['updated'])
const form=ref({checked:[],carrier:'',tracking_number:'',tracking_url:'',admin_note:''}),loading=ref(false),loaded=ref(false),busy=ref(false),error=ref(''),success=ref('')
const key=item=>`${item.producto_id}:${item.tono_seleccionado || ''}`
const allChecked=computed(()=>(props.order.items || []).length>0 && props.order.items.every(i=>form.value.checked.includes(key(i))))
const phone=computed(()=>String(props.order.cliente_telefono || '').replace(/\D/g,''))
async function load(){const id=props.order.id;loading.value=true;loaded.value=false;error.value='';success.value='';try{const {data}=await managementApi.fulfillment(id);if(props.order.id!==id)return;form.value={checked:[],carrier:'',tracking_number:'',tracking_url:'',admin_note:'',...data};loaded.value=true}catch(e){if(props.order.id===id)error.value=e.response?.data?.error || 'No pudimos cargar la preparación.'}finally{if(props.order.id===id)loading.value=false}}
watch(()=>props.order.id,load,{immediate:true})
async function copyAddress(){try{await navigator.clipboard.writeText([props.order.direccion_envio,props.order.ciudad_envio,props.order.region_envio].filter(Boolean).join(', '));success.value='Dirección copiada.'}catch{error.value='No se pudo copiar. Puedes seleccionar la dirección en el detalle del pedido.'}}
async function save(dispatch){if(busy.value)return;const id=props.order.id,data=JSON.parse(JSON.stringify(form.value));busy.value=true;error.value='';success.value='';try{await managementApi.saveFulfillment(id,data);if(dispatch)await pedidosApi.cambiarEstado(id,'shipped');if(props.order.id===id)success.value=dispatch ? 'Estado actualizado. El aviso a la clienta quedó registrado.' : 'Preparación guardada.';emit('updated')}catch(e){if(props.order.id===id)error.value=e.response?.data?.error || 'No pudimos guardar la preparación.'}finally{busy.value=false}}
</script>
<style scoped>
.fulfillment{border-top:1px solid var(--ad-border);padding-top:24px;margin-top:24px;display:grid;gap:16px}.fulfillment h3{margin:0;font-size:18px}.packing-list{display:grid}.packing-list label{display:flex;gap:12px;align-items:center;border-bottom:1px solid var(--ad-border);padding:16px 0;cursor:pointer}.packing-list input{height:22px;width:22px;flex-shrink:0}.packing-list span{display:grid;gap:6px;overflow-wrap:anywhere}.packing-list small{color:var(--ad-muted)}.fulfillment-actions{display:flex;flex-wrap:wrap;gap:10px}.fulfillment-actions a{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--ad-border);border-radius:6px;min-height:44px;padding:10px 14px;color:var(--ad-text);text-decoration:none}@media(max-width:720px){.fulfillment-actions>*{flex:1;justify-content:center}}
</style>
