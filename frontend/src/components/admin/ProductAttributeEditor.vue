<template>
  <fieldset class="attribute-editor">
    <legend>{{ label }}</legend>
    <div v-if="options.length" class="attribute-options">
      <label v-for="option in options" :key="attributeKey(option)" class="attribute-option">
        <input type="checkbox" :checked="isSelected(option)" :disabled="!isSelected(option) && modelValue.length >= 20" @change="toggle(option)">
        <span>{{ option }}</span>
      </label>
    </div>
    <div class="attribute-add">
      <input v-model="draft" type="text" maxlength="60" :aria-label="`Nueva etiqueta: ${label}`" :placeholder="`Nueva etiqueta`" @keydown.enter.prevent="addLabel">
      <button type="button" :title="`Agregar etiqueta: ${label}`" :aria-label="`Agregar etiqueta: ${label}`" :disabled="!draft.trim() || modelValue.length >= 20" @click="addLabel"><Plus :size="18" /></button>
      <button type="button" :title="`Quitar todas: ${label}`" :aria-label="`Quitar todas: ${label}`" :disabled="!modelValue.length" @click="emit('update:modelValue', [])"><X :size="18" /></button>
    </div>
    <p v-if="error" role="alert" class="attribute-error">{{ error }}</p>
  </fieldset>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Plus, X } from 'lucide-vue-next'
import { attributeKey, attributeLabels } from '../../utils/catalogFilters.mjs'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  suggestions: { type: Array, default: () => [] },
  label: { type: String, required: true },
})
const emit = defineEmits(['update:modelValue'])
const draft = ref('')
const error = ref('')
const options = computed(() => attributeLabels([...props.suggestions, ...props.modelValue]))
const isSelected = label => props.modelValue.some(value => attributeKey(value) === attributeKey(label))

function toggle(label) {
  emit('update:modelValue', isSelected(label)
    ? props.modelValue.filter(value => attributeKey(value) !== attributeKey(label))
    : attributeLabels([...props.modelValue, label]))
}

function addLabel() {
  const label = draft.value.trim().replace(/\s+/g, ' ')
  if (!label || props.modelValue.length >= 20) return
  if (/[\u0000-\u001f<>]/.test(label) || attributeKey(label) === 'all') {
    error.value = 'Etiqueta no válida.'
    return
  }
  emit('update:modelValue', attributeLabels([...props.modelValue, label]))
  draft.value = ''
  error.value = ''
}
</script>

<style scoped>
.attribute-editor { border: 0; padding: 0; margin: 0 0 20px; min-width: 0; color: var(--ad-text); }
legend { padding: 0; margin-bottom: 8px; font-size: 14px; }
.attribute-options { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-bottom: 8px; }
.attribute-option { display: flex; align-items: center; gap: 8px; min-height: 44px; max-width: 100%; font-size: 14px; cursor: pointer; }
.attribute-option input { width: 18px; height: 18px; flex: 0 0 18px; accent-color: var(--rose); }
.attribute-option span { overflow-wrap: anywhere; }
.attribute-add { display: grid; grid-template-columns: minmax(0, 1fr) 44px 44px; gap: 8px; }
.attribute-add input { min-width: 0; width: 100%; padding: 10px; border: 1px solid var(--ad-border); border-radius: 6px; background: var(--ad-bg); color: var(--ad-text); font: inherit; font-size: 16px; }
button { display: flex; align-items: center; justify-content: center; min-height: 44px; border: 1px solid var(--ad-border); border-radius: 6px; background: var(--ad-bg); color: var(--rose); cursor: pointer; }
button:disabled { opacity: .45; cursor: default; }
input:focus-visible, button:focus-visible { outline: 2px solid var(--rose); outline-offset: 2px; }
.attribute-error { color: var(--rose); font-size: 14px; margin-top: 8px; }
</style>
