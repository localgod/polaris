<template>
  <div class="stat-card">
    <div class="stat-label">{{ label }}</div>
    <div class="stat-value" :class="valueClass">{{ value }}</div>
    <div v-if="change" style="margin-top: 0.5rem; font-size: 0.875rem;">
      <span :style="{ color: changeDirection === 'up' ? 'var(--color-success)' : 'var(--color-error)' }">
        {{ changeDirection === 'up' ? '↑' : '↓' }} {{ change }}
      </span>
      <span v-if="changeLabel" style="margin-left: 0.5rem; color: var(--color-text-muted);">{{ changeLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string
  value: string | number
  change?: string
  changeLabel?: string
  changeDirection?: 'up' | 'down'
  icon?: object
  variant?: 'primary' | 'success' | 'warning' | 'error'
}>()

const valueClass = computed(() => {
  const colors: Record<string, string> = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error'
  }
  return colors[props.variant || 'primary'] || ''
})
</script>
