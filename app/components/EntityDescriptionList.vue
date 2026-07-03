<template>
  <div class="grid grid-cols-1 gap-x-6 gap-y-4" :class="{ 'sm:grid-cols-2': columns === 2 }">
    <div v-for="item in items" :key="item.key" :class="{ 'sm:col-span-2': item.span === 2 && columns === 2 }">
      <span class="text-sm text-muted">{{ item.label }}</span>
      <slot :name="item.key" :item="item">
        <div v-if="item.tags" class="mt-1 flex flex-wrap gap-2">
          <template v-for="tag in item.tags" :key="tag.label">
            <UButton
              v-if="tag.to"
              :label="tag.label"
              :to="tag.to"
              variant="subtle"
              :color="tag.color ?? 'neutral'"
              size="sm"
            />
            <UBadge v-else :color="tag.color ?? 'neutral'" variant="subtle">
              {{ tag.label }}
            </UBadge>
          </template>
          <span v-if="item.tags.length === 0" class="text-muted text-sm">—</span>
        </div>
        <p v-else class="font-medium mt-0.5">{{ item.value ?? '—' }}</p>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
type SemanticColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

interface DescriptionTag {
  label: string
  to?: string
  color?: SemanticColor
}

interface DescriptionItem {
  key: string
  label: string
  value?: string | number | null
  tags?: DescriptionTag[]
  span?: 1 | 2
}

withDefaults(defineProps<{
  items: DescriptionItem[]
  columns?: 1 | 2
}>(), {
  columns: 2
})
</script>
