<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-shield-check" class="w-5 h-5 text-(--ui-text-muted)" />
          <h2 class="text-lg font-semibold">Compliance Scorecard</h2>
        </div>
        <UBadge :color="scoreColor" variant="subtle">
          {{ scorecard.score }} / {{ scorecard.maxScore }}
        </UBadge>
      </div>
    </template>

    <UProgress :model-value="scorecard.score" :max="scorecard.maxScore" :color="scoreColor" class="mb-4" />

    <ul class="space-y-3">
      <li v-for="check in scorecard.checks" :key="check.id" class="flex items-start gap-2">
        <UIcon
          :name="check.passed ? 'i-lucide-check-circle-2' : 'i-lucide-x-circle'"
          :class="check.passed ? 'text-(--ui-success)' : 'text-(--ui-error)'"
          class="w-5 h-5 mt-0.5 shrink-0"
        />
        <div>
          <p class="font-medium text-sm">{{ check.label }}</p>
          <p class="text-sm text-(--ui-text-muted)">{{ check.detail }}</p>
        </div>
      </li>
    </ul>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Scorecard } from '~~/types/api'

const props = defineProps<{ scorecard: Scorecard }>()

const scoreColor = computed<'success' | 'warning' | 'error'>(() => {
  const ratio = props.scorecard.maxScore === 0 ? 1 : props.scorecard.score / props.scorecard.maxScore
  if (ratio === 1) return 'success'
  if (ratio >= 0.6) return 'warning'
  return 'error'
})
</script>
