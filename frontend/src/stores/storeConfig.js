import {defineStore} from 'pinia'
import {ref,computed} from 'vue'
import {defaultOperations} from '../constants/storeOperations.js'
export const useStoreConfig=defineStore('store-config',()=>{
  const site=ref({})
  const operations=computed(()=>({...defaultOperations,...site.value.operations}))
  function setSite(settings){site.value=settings || {}}
  return {site,operations,setSite}
})
