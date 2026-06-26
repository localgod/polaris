<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex flex-wrap items-center gap-2">
      <UCheckbox
        v-for="scope in scopes"
        :key="scope"
        :model-value="modelValue.includes(scope)"
        :label="scope"
        class="rounded-md border border-(--ui-border) px-3 py-1.5 text-sm"
        @update:model-value="toggleScope(scope)"
      />
    </div>

    <div class="flex items-center gap-2">
      <UBadge v-if="modelValue.length > 0" color="primary" variant="subtle">
        {{ modelValue.length }} active
      </UBadge>
      <UButton
        label="Clear filters"
        icon="i-lucide-x"
        variant="ghost"
        color="neutral"
        size="sm"
        :disabled="modelValue.length === 0"
        @click="emit('update:modelValue', [])"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DependencyScope } from '~~/types/api'

const props = defineProps<{
  modelValue: DependencyScope[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DependencyScope[]]
}>()

const scopes: DependencyScope[] = ['runtime', 'required', 'dev', 'optional', 'test', 'provided', 'excluded']

function toggleScope(scope: DependencyScope) {
  const next = props.modelValue.includes(scope)
    ? props.modelValue.filter(value => value !== scope)
    : [...props.modelValue, scope]

  emit('update:modelValue', next)
}
</script>
