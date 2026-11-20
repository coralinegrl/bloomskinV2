<template>
  <div class="store-select">
    <select :value="modelValue" :aria-label="label || undefined" @change="$emit('update:modelValue', $event.target.value)">
      <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
    <ChevronDown :size="16" class="store-select-chevron" aria-hidden="true" />
  </div>
</template>

<script setup>
import { ChevronDown } from 'lucide-vue-next'

defineProps({
  label: { type: String, default: '' },
  modelValue: {
    type: String,
    required: true,
  },
  options: {
    type: Array,
    required: true,
  },
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.store-select select {
  appearance: none;
  -webkit-appearance: none;
  display: block;
  width: 100%;
  min-height: 44px;
  padding: 10px 38px 10px 12px;
  border: 1px solid var(--line-soft);
  border-radius: 6px;
  background: white;
  color: var(--dark);
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
  text-overflow: ellipsis;
}
.store-select select:hover { border-color: var(--rose); }
.store-select .store-select-chevron { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; }
@media (max-width: 720px) { .store-select select { font-size: 16px; } }
.store-select {
  position: relative;
  min-width: 0;
}

.store-select-chevron {
  color: var(--rose-dark);
}
</style>
