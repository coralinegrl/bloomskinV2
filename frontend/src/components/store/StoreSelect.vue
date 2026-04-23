<template>
  <div ref="root" class="store-select">
    <button
      class="store-select-trigger"
      :class="{ open: isOpen }"
      type="button"
      @click="isOpen = !isOpen"
    >
      <span class="store-select-label">{{ selectedLabel }}</span>
      <span class="store-select-chevron">⌄</span>
    </button>

    <Transition name="select-pop">
      <div v-if="isOpen" class="store-select-menu">
        <button
          v-for="option in options"
          :key="option.value"
          class="store-select-option"
          :class="{ active: modelValue === option.value }"
          type="button"
          @click="handleSelect(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
  },
  options: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['update:modelValue'])

const root = ref(null)
const isOpen = ref(false)

const selectedLabel = computed(() => (
  props.options.find(option => option.value === props.modelValue)?.label || ''
))

function handleSelect(value) {
  emit('update:modelValue', value)
  isOpen.value = false
}

function handleClickOutside(event) {
  if (!root.value?.contains(event.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.store-select {
  position: relative;
  min-width: 170px;
}

.store-select-trigger {
  width: 100%;
  border: 1px solid rgba(196, 100, 122, 0.18);
  border-radius: 999px;
  padding: 11px 16px;
  background: linear-gradient(135deg, rgba(255,255,255,0.98), rgba(249,239,242,0.95));
  color: var(--dark);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: .02em;
  box-shadow: 0 10px 24px rgba(139, 63, 85, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  transition: border-color .2s, box-shadow .2s;
}

.store-select-trigger:hover,
.store-select-trigger.open {
  border-color: rgba(196, 100, 122, 0.32);
  box-shadow: 0 12px 28px rgba(139, 63, 85, 0.09);
}

.store-select-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.store-select-chevron {
  color: var(--rose-dark);
  font-size: 14px;
  line-height: 1;
}

.store-select-menu {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  right: 0;
  max-height: 280px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid rgba(196, 100, 122, 0.16);
  border-radius: 20px;
  background: rgba(255, 251, 252, 0.98);
  box-shadow: 0 20px 40px rgba(139, 63, 85, 0.16);
  backdrop-filter: blur(14px);
  z-index: 20;
}

.store-select-option {
  width: 100%;
  border: none;
  background: transparent;
  border-radius: 14px;
  padding: 11px 12px;
  text-align: left;
  font-size: 12px;
  color: var(--dark);
  transition: background .18s, color .18s;
}

.store-select-option:hover {
  background: rgba(196, 100, 122, 0.1);
  color: var(--rose-dark);
}

.store-select-option.active {
  background: var(--rose-dark);
  color: white;
}

.select-pop-enter-active,
.select-pop-leave-active {
  transition: all .16s ease;
}

.select-pop-enter-from,
.select-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
