<template>
  <div class="management-work operations-editor">
    <fieldset><legend>Estado de la tienda</legend><label class="check-label"><input v-model="form.accepting_orders" type="checkbox"> Recibir nuevas compras</label><label>Mensaje cuando las compras estén pausadas<textarea v-model.trim="form.pause_message" maxlength="400" rows="3"></textarea></label></fieldset>
    <fieldset><legend>Retiro</legend><label class="check-label"><input v-model="form.pickup_enabled" type="checkbox"> Permitir retiro</label><div class="work-grid"><label>Dirección de retiro<input v-model.trim="form.pickup_address" maxlength="200" required></label><label>Ciudad de retiro<input v-model.trim="form.pickup_city" maxlength="100" required></label></div><label>Horario o coordinación<input v-model.trim="form.pickup_hours" maxlength="300" required></label></fieldset>
    <fieldset><legend>Despachos</legend><label class="check-label"><input v-model="form.delivery_enabled" type="checkbox"> Permitir despacho a domicilio</label><label class="check-label"><input v-model="form.national_enabled" type="checkbox"> Despachar fuera de la ciudad de retiro</label><div class="work-grid"><label>Transportista nacional<input v-model.trim="form.national_carrier" maxlength="80" required></label><label>Tarifa nacional (CLP)<input v-model.number="form.national_fee" type="number" inputmode="numeric" min="0" step="1"></label></div><h3>Tramos de despacho local</h3><div v-for="(tier,index) in form.local_tiers" :key="index" class="tier-row"><label>Hasta (km)<input v-model.number="tier.km" type="number" inputmode="decimal" min="0.1" max="500" step="0.1"></label><label>Valor (CLP)<input v-model.number="tier.fee" type="number" inputmode="numeric" min="0" step="1"></label><button type="button" :disabled="form.local_tiers.length===1" aria-label="Quitar tramo" @click="form.local_tiers.splice(index,1)"><Trash2 :size="18"/></button></div><button type="button" :disabled="form.local_tiers.length>=10" @click="form.local_tiers.push({km:form.local_tiers.at(-1).km+1,fee:0})"><Plus :size="18"/> Agregar tramo</button></fieldset>
    <fieldset><legend>Envío gratis e inventario</legend><label class="check-label"><input v-model="form.free_shipping_enabled" type="checkbox"> Ofrecer envío gratis</label><div class="work-grid"><label>Compra mínima para envío gratis (CLP)<input v-model.number="form.free_shipping_threshold" type="number" inputmode="numeric" min="0" step="1"></label><label>Avisar stock bajo desde<input v-model.number="form.low_stock_threshold" type="number" inputmode="numeric" min="0" max="1000" step="1"></label></div></fieldset>
  </div>
</template>
<script setup>
import {computed} from 'vue'
import {Trash2,Plus} from 'lucide-vue-next'
const props=defineProps({modelValue:{type:Object,required:true}})
const form=computed(()=>props.modelValue)
</script>
<style scoped>
fieldset{border:0;border-top:1px solid var(--ad-border);padding:24px 0;margin:0;display:grid;gap:18px;min-width:0}legend{font-weight:600;font-size:18px;padding:0 12px 0 0}h3{font-size:16px;margin:4px 0}.tier-row{display:grid;grid-template-columns:1fr 1fr 44px;align-items:end;gap:12px}.tier-row button{width:44px;height:44px;justify-content:center;padding:0}.check-label{display:flex;align-items:center;gap:10px;min-height:44px}.check-label input{width:20px;height:20px;flex-shrink:0}
</style>
