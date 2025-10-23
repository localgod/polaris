<template>
  <NuxtLayout name="default">
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Policies</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Governance and compliance rules</p>
      </div>

      <UiCard v-if="pending">
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"/>
          <p class="mt-4 text-gray-600 dark:text-gray-300">Loading policies...</p>
        </div>
      </UiCard>

      <UiCard v-else-if="error">
        <div class="flex items-center gap-4 text-error-600 dark:text-error-400">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 class="text-lg font-semibold">Error</h3>
            <p class="text-sm">{{ error.message }}</p>
          </div>
        </div>
      </UiCard>

      <template v-else-if="data">
        <UiCard>
          <div class="text-center">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Total Policies</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{{ data.count }}</p>
          </div>
        </UiCard>

        <div class="grid grid-cols-1 gap-6">
          <UiCard v-for="policy in data.data" :key="policy.name">
            <template #header>
              <div class="flex items-start justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ policy.name }}</h3>
                  <p v-if="policy.description" class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ policy.description }}</p>
                </div>
                <UiBadge v-if="policy.severity" :variant="getSeverityVariant(policy.severity)" size="sm">
                  {{ policy.severity }}
                </UiBadge>
              </div>
            </template>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div v-if="policy.ruleType">
                <span class="text-gray-600 dark:text-gray-300">Type:</span>
                <span class="ml-2 text-gray-900 dark:text-white">{{ policy.ruleType }}</span>
              </div>
              <div v-if="policy.scope">
                <span class="text-gray-600 dark:text-gray-300">Scope:</span>
                <span class="ml-2 text-gray-900 dark:text-white">{{ policy.scope }}</span>
              </div>
              <div v-if="policy.enforcedBy">
                <span class="text-gray-600 dark:text-gray-300">Enforced By:</span>
                <span class="ml-2 text-gray-900 dark:text-white">{{ policy.enforcedBy }}</span>
              </div>
              <div v-if="policy.status">
                <span class="text-gray-600 dark:text-gray-300">Status:</span>
                <UiBadge variant="success" size="sm" class="ml-2">{{ policy.status }}</UiBadge>
              </div>
            </div>
          </UiCard>
        </div>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
const { data, pending, error } = await useFetch('/api/policies')

function getSeverityVariant(severity: string) {
  const variants: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error',
    error: 'error',
    warning: 'warning',
    info: 'neutral'
  }
  return variants[severity] || 'neutral'
}

useHead({ title: 'Policies - Polaris' })
</script>
