<template>
  <div class="star-rating" :aria-label="`${rating} de 5 estrellas`">
    <span
      v-for="index in 5"
      :key="index"
      class="star"
      :class="{ filled: index <= rating }"
    >
      ★
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: [String, Number],
    default: 5,
  },
})

const rating = computed(() => {
  if (typeof props.value === 'number') {
    return Math.max(0, Math.min(5, Math.round(props.value)))
  }

  if (typeof props.value === 'string') {
    const filled = (props.value.match(/★/g) || []).length
    const empty = (props.value.match(/☆/g) || []).length

    if (filled || empty) {
      return Math.max(0, Math.min(5, filled))
    }

    if (props.value.includes('?')) {
      return 5
    }
  }

  return 5
})
</script>

<style scoped>
.star-rating {
  display: inline-flex;
  gap: 2px;
}

.star {
  color: #dfd3b4;
  font-size: 11px;
  line-height: 1;
}

.star.filled {
  color: #d4a84b;
}
</style>
