<template>
  <Teleport to="body">
    <div class="toast-stack" aria-live="polite" aria-atomic="true">
      <TransitionGroup name="toast">
        <article
          v-for="toast in ui.toasts"
          :key="toast.id"
          class="toast"
          :class="`toast-${toast.tone}`"
        >
          <div class="toast-copy">
            <strong>{{ toast.title }}</strong>
            <p>{{ toast.message }}</p>
          </div>
          <button class="toast-close" @click="ui.removeToast(toast.id)" aria-label="Cerrar mensaje">
            x
          </button>
        </article>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useUiStore } from '../../stores/ui.js'

const ui = useUiStore()
</script>

<style scoped>
.toast-stack {
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 500;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(360px, calc(100vw - 24px));
}

.toast {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 14px 14px 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(42, 24, 32, 0.08);
  box-shadow: 0 12px 30px rgba(42, 24, 32, 0.16);
  backdrop-filter: blur(16px);
  background: rgba(255, 252, 253, 0.96);
}

.toast-copy strong {
  display: block;
  font-size: 13px;
  color: var(--dark);
  margin-bottom: 4px;
}

.toast-copy p {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--dark-mid);
}

.toast-success {
  border-left: 4px solid #5d8d6a;
}

.toast-error {
  border-left: 4px solid #b85b62;
}

.toast-info {
  border-left: 4px solid #8b6a75;
}

.toast-close {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1;
  padding: 4px;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.22s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

@media (max-width: 640px) {
  .toast-stack {
    top: auto;
    right: 12px;
    left: 12px;
    bottom: 12px;
    width: auto;
  }
}
</style>
