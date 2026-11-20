<template><section v-if="tracking?.tracking_number || tracking?.tracking_url" class="order-tracking"><strong>Seguimiento de tu pedido</strong><p>{{ tracking.carrier }}<span v-if="tracking.tracking_number"> · {{ tracking.tracking_number }}</span></p><a v-if="safeUrl" :href="safeUrl" target="_blank" rel="noopener noreferrer">Seguir envío <ExternalLink :size="16"/></a></section></template>
<script setup>
import {computed} from 'vue'
import {ExternalLink} from 'lucide-vue-next'
const props=defineProps({tracking:{type:Object,default:null}})
const safeUrl=computed(()=>{try{const u=new URL(props.tracking?.tracking_url);return u.protocol==='https:'&&!u.username&&!u.password ? u.href : ''}catch{return ''}})
</script>
<style scoped>.order-tracking{padding:20px 0;margin:12px 0;border-top:1px solid #efd8df;border-bottom:1px solid #efd8df;overflow-wrap:anywhere}.order-tracking p{font-size:14px;margin:12px 0}.order-tracking a{display:inline-flex;align-items:center;gap:8px;min-height:44px;color:#9b3b65;font-weight:600;font-size:14px}</style>
