<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <slot name="search-input">
      <UInput
        v-model="searchInput"
        placeholder="Filter by name..."
        icon="i-lucide-search"
        class="max-w-sm"
      />
    </slot>
    <div class="flex flex-wrap items-center gap-4">
      <slot name="filters" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string
}

interface Emits {
  'update:modelValue': [value: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const searchInput = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
})
</script>
