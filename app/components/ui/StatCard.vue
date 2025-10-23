<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <p class="text-sm font-medium text-gray-600 dark:text-gray-300">{{ label }}</p>
        <p class="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">{{ value }}</p>
        <p v-if="change" class="mt-2 flex items-center text-sm">
          <span :class="changeColor">
            <svg v-if="changeDirection === 'up'" class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
            </svg>
            <svg v-else class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
            {{ change }}
          </span>
          <span class="ml-2 text-gray-600 dark:text-gray-300">{{ changeLabel }}</span>
        </p>
      </div>
      <div v-if="icon" :class="iconBgColor" class="flex-shrink-0 p-3 rounded-lg">
        <component :is="icon" class="w-6 h-6" :class="iconColor" />
      </div>
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

const changeColor = computed(() => {
  if (!props.change) return ''
  return props.changeDirection === 'up' 
    ? 'text-success-600 dark:text-success-400 flex items-center'
    : 'text-error-600 dark:text-error-400 flex items-center'
})

const iconBgColor = computed(() => {
  const colors = {
    primary: 'bg-primary-100 dark:bg-primary-900/30',
    success: 'bg-success-100 dark:bg-success-900/30',
    warning: 'bg-warning-100 dark:bg-warning-900/30',
    error: 'bg-error-100 dark:bg-error-900/30'
  }
  return colors[props.variant || 'primary']
})

const iconColor = computed(() => {
  const colors = {
    primary: 'text-primary-600 dark:text-primary-400',
    success: 'text-success-600 dark:text-success-400',
    warning: 'text-warning-600 dark:text-warning-400',
    error: 'text-error-600 dark:text-error-400'
  }
  return colors[props.variant || 'primary']
})
</script>
