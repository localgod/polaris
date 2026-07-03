<template>
  <div class="rounded-lg overflow-hidden bg-default ring ring-default flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-default">
    <component
      :is="item.to ? NuxtLink : 'div'"
      v-for="item in items"
      :key="item.label"
      :to="item.to"
      class="flex-1 p-4 text-center"
      :class="{ 'hover:bg-elevated transition-colors': item.to }"
    >
      <p class="text-sm text-muted">{{ item.label }}</p>
      <p class="text-2xl font-bold mt-1">{{ item.value }}</p>
    </component>
  </div>
</template>

<script setup lang="ts">
const NuxtLink = resolveComponent('NuxtLink')

interface StatStripItem {
  label: string
  value: string | number
  to?: string
}

defineProps<{
  items: StatStripItem[]
}>()
</script>
