<template>
  <form v-if="soldOut.length" class="restock-alert" @submit.prevent="subscribe"><h3>¿Quieres que te avisemos cuando vuelva?</h3><label v-if="product.usa_tonos">Tipo<select v-model="variant"><option v-for="tone in soldOut" :key="tone" :value="tone">{{ tone }}</option></select></label><label>Tu correo<input v-model.trim="email" type="email" autocomplete="email" maxlength="254" required></label><label class="restock-consent"><input v-model="consent" type="checkbox" required> Quiero recibir un correo cuando vuelva este producto{{ variant ? ` (${variant})` : '' }}.</label><button type="submit" :disabled="busy || !consent"><Bell :size="18"/> {{ busy ? 'Guardando…' : 'Avísame cuando vuelva' }}</button><p v-if="message" :role="failed ? 'alert' : 'status'">{{ message }}</p></form>
</template>
<script setup>
import {computed,ref,watch} from 'vue'
import {Bell} from 'lucide-vue-next'
import {restockApi} from '../../api/index.js'
const props=defineProps({product:{type:Object,required:true}})
const soldOut=computed(()=>props.product.usa_tonos ? (props.product.tonos || []).filter(t=>Number(props.product.tonos_stock?.[t] || 0)===0) : Number(props.product.stock)===0 ? [''] : [])
const variant=ref(''),email=ref(''),consent=ref(false),busy=ref(false),message=ref(''),failed=ref(false)
watch(()=>[props.product.id,...soldOut.value],()=>{variant.value=soldOut.value[0] || '';message.value='';consent.value=false},{immediate:true})
async function subscribe(){busy.value=true;message.value='';failed.value=false;try{await restockApi.subscribe({producto_id:props.product.id,variant:variant.value,email:email.value,consent:consent.value});message.value='Listo, te avisaremos por correo cuando vuelva. Este aviso no reserva stock.';consent.value=false}catch(e){failed.value=true;message.value=e.response?.data?.error || 'No pudimos guardar el aviso. Intenta nuevamente.'}finally{busy.value=false}}
</script>
<style scoped>
.restock-alert{border-top:1px solid #efd8df;margin-top:24px;padding-top:24px;display:grid;gap:14px;color:var(--dark)}.restock-alert h3{font-size:18px;line-height:1.4;margin:0}.restock-alert label{display:grid;gap:8px;font-size:14px}.restock-alert input,.restock-alert select{font:inherit;font-size:16px;border:1px solid #dfb7c7;border-radius:6px;min-height:44px;padding:10px;background:#fff;color:var(--dark);min-width:0;width:100%}.restock-alert .restock-consent{display:flex;gap:10px;align-items:flex-start;line-height:1.5}.restock-consent input{width:20px;height:20px;min-height:20px;flex-shrink:0;margin-top:2px;accent-color:#bf547a}.restock-alert button{display:flex;align-items:center;justify-content:center;gap:10px;font:inherit;font-size:14px;background:#bf547a;border:0;color:white;border-radius:6px;min-height:46px;padding:12px;cursor:pointer}.restock-alert button:disabled{opacity:.5;cursor:not-allowed}.restock-alert p{font-size:14px;line-height:1.6;margin:0}.restock-alert p[role=alert]{color:#a52945}
</style>
