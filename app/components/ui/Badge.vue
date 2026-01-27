<template>
  <span class="badge" :class="badgeClass">
    <slot />
  </span>
</template>

<script setup lang="ts">
const props = defineProps<{
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral'
  size?: 'sm' | 'md' | 'lg'
}>()

const badgeClass = computed(() => {
  const variants: Record<string, string> = {
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    neutral: 'badge-neutral'
  }
  return variants[props.variant || 'neutral']
})
</script>
