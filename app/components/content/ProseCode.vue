<template>
  <div v-if="language === 'mermaid'" class="mermaid-container">
    <div ref="mermaidEl" class="mermaid">
      {{ code }}
    </div>
  </div>
  <pre v-else :class="$props.class"><slot /></pre>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import mermaid from 'mermaid'

const props = defineProps({
  code: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: null
  },
  filename: {
    type: String,
    default: null
  },
  highlights: {
    type: Array as () => number[],
    default: () => []
  },
  meta: {
    type: String,
    default: null
  },
  class: {
    type: String,
    default: ''
  }
})

const mermaidEl = ref<HTMLElement | null>(null)

onMounted(async () => {
  if (props.language === 'mermaid' && mermaidEl.value) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif'
    })
    
    try {
      const { svg } = await mermaid.render(`mermaid-${Date.now()}`, props.code)
      if (mermaidEl.value) {
        mermaidEl.value.innerHTML = svg
      }
    } catch (error) {
      console.error('Mermaid rendering error:', error)
      if (mermaidEl.value) {
        mermaidEl.value.innerHTML = `<pre style="color: var(--color-error);">Error rendering diagram: ${error}</pre>`
      }
    }
  }
})
</script>

<style scoped>
.mermaid-container {
  width: 100%;
  margin: 2rem 0;
}

.mermaid {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  background: white;
  padding: 1.5rem;
  border-radius: 0.5rem;
  border: 1px solid var(--color-border);
  overflow-x: auto;
}

:deep(svg) {
  max-width: 100%;
  height: auto;
}
</style>
