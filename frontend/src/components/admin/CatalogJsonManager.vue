<template>
  <div class="catalog-card">
    <div class="catalog-head">
      <div>
      <div class="catalog-title">Catálogo JSON</div>
      <p class="catalog-copy">Edita el catálogo fuente, guárdalo y reimpórtalo a la base sin tocar SQL.</p>
      </div>
      <div class="catalog-actions">
        <button class="btn-ghost" :disabled="loading" @click="loadCatalog">
          {{ loading ? 'Cargando...' : 'Cargar JSON' }}
        </button>
        <button class="btn-ghost" :disabled="saving || !jsonText" @click="saveJson">
          {{ saving ? 'Guardando...' : 'Guardar JSON' }}
        </button>
        <button class="btn-primary" :disabled="importing || !jsonText" @click="importJson">
          {{ importing ? 'Importando...' : 'Importar a DB' }}
        </button>
      </div>
    </div>

    <div class="catalog-summary">
      <span class="summary-chip">Productos: {{ parsedCount }}</span>
      <span class="summary-chip">Imagenes: {{ withImages }}</span>
    </div>

    <textarea
      v-model="jsonText"
      class="catalog-editor"
      spellcheck="false"
      placeholder='[{"marca":"...","nombre":"..."}]'
    ></textarea>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { productosApi } from '../../api/index.js'

const emit = defineEmits(['toast', 'imported'])

const jsonText = ref('')
const loading = ref(false)
const saving = ref(false)
const importing = ref(false)

const parsedProducts = computed(() => {
  try {
    const parsed = JSON.parse(jsonText.value || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
})

const parsedCount = computed(() => parsedProducts.value.length)
const withImages = computed(() => parsedProducts.value.filter(product => product.imagen_url).length)

onMounted(() => {
  void loadCatalog()
})

async function loadCatalog() {
  loading.value = true
  try {
    const { data } = await productosApi.obtenerCatalogoJson()
    jsonText.value = JSON.stringify(data.products || [], null, 2)
  } catch (error) {
    emit('toast', error.response?.data?.error || 'No se pudo cargar el catálogo JSON.', 'error')
  } finally {
    loading.value = false
  }
}

async function saveJson() {
  let products
  try {
    products = JSON.parse(jsonText.value)
    if (!Array.isArray(products)) throw new Error()
  } catch {
    emit('toast', 'El contenido debe ser un arreglo JSON valido.', 'error')
    return
  }

  saving.value = true
  try {
    await productosApi.guardarCatalogoJson(products)
    emit('toast', 'Catálogo JSON guardado.')
  } catch (error) {
    emit('toast', error.response?.data?.error || 'No se pudo guardar el catálogo JSON.', 'error')
  } finally {
    saving.value = false
  }
}

async function importJson() {
  let products
  try {
    products = JSON.parse(jsonText.value)
    if (!Array.isArray(products)) throw new Error()
  } catch {
    emit('toast', 'El contenido debe ser un arreglo JSON valido.', 'error')
    return
  }

  importing.value = true
  try {
    await productosApi.guardarCatalogoJson(products)
    await productosApi.importarCatalogoJson(products)
    emit('toast', 'Catálogo importado a la base correctamente.')
    emit('imported')
  } catch (error) {
    emit('toast', error.response?.data?.error || 'No se pudo importar el catálogo.', 'error')
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.catalog-card {
  background: var(--ad-surface);
  border: 1px solid var(--ad-border);
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 20px;
}

.catalog-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.catalog-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ad-text);
}

.catalog-copy {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ad-muted);
}

.catalog-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.catalog-summary {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.summary-chip {
  background: rgba(255,255,255,.03);
  color: var(--ad-muted);
  border: 1px solid var(--ad-border);
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
}

.catalog-editor {
  width: 100%;
  min-height: 280px;
  border-radius: 10px;
  border: 1px solid var(--ad-border);
  background: var(--ad-bg);
  color: var(--ad-text);
  padding: 14px;
  font-size: 12px;
  line-height: 1.5;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

@media (max-width: 900px) {
  .catalog-head {
    flex-direction: column;
  }
}
</style>
