<template>
  <NuxtLayout name="default">
    <div class="space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Systems</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Deployable applications and services
        </p>
      </div>

      <!-- Loading State -->
      <UiCard v-if="pending">
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"/>
          <p class="mt-4 text-gray-600 dark:text-gray-300">Loading systems...</p>
        </div>
      </UiCard>

      <!-- Error State -->
      <UiCard v-else-if="error">
        <div class="flex items-center gap-4 text-error-600 dark:text-error-400">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 class="text-lg font-semibold">Error Loading Systems</h3>
            <p class="text-sm">{{ error.message }}</p>
          </div>
        </div>
      </UiCard>

      <!-- No Data State -->
      <UiCard v-else-if="!data?.data || data.data.length === 0">
        <div class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 class="mt-4 text-lg font-semibold text-gray-900 dark:text-white">No Systems Found</h3>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            The database appears to be empty. Try running: <code class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">npm run seed</code>
          </p>
        </div>
      </UiCard>

      <!-- Systems List -->
      <template v-else>
        <!-- Summary Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <UiCard>
            <div class="text-center">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Total Systems</p>
              <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{{ data.count }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Critical</p>
              <p class="mt-2 text-3xl font-bold text-error-600 dark:text-error-400">{{ criticalityCounts.critical }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-300">High</p>
              <p class="mt-2 text-3xl font-bold text-warning-600 dark:text-warning-400">{{ criticalityCounts.high }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Medium/Low</p>
              <p class="mt-2 text-3xl font-bold text-success-600 dark:text-success-400">{{ criticalityCounts.medium + criticalityCounts.low }}</p>
            </div>
          </UiCard>
        </div>

        <!-- Systems Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <UiCard v-for="system in data.data" :key="system.name">
            <template #header>
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {{ system.name }}
                  </h3>
                  <p class="text-sm text-gray-500 dark:text-gray-300">{{ system.domain }}</p>
                </div>
                <UiBadge 
                  :variant="getCriticalityVariant(system.businessCriticality)"
                  size="sm"
                >
                  {{ system.businessCriticality }}
                </UiBadge>
              </div>
            </template>

            <div class="space-y-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-300">Environment</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ system.environment }}</span>
              </div>
              
              <div v-if="system.ownerTeam" class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-300">Owner</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ system.ownerTeam }}</span>
              </div>
              
              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-300">Components</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ system.componentCount }}</span>
              </div>
            </div>

            <template #footer>
              <NuxtLink 
                :to="`/systems/${encodeURIComponent(system.name)}/unmapped-components`"
                class="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                View unmapped components
              </NuxtLink>
            </template>
          </UiCard>
        </div>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
interface System {
  name: string
  domain: string
  ownerTeam: string
  businessCriticality: string
  environment: string
  ownerTeamName: string | null
  componentCount: number
}

interface SystemsResponse {
  success: boolean
  data: System[]
  count: number
  error?: string
}

const { data, pending, error } = await useFetch<SystemsResponse>('/api/systems')

const criticalityCounts = computed(() => {
  if (!data.value?.data) return { critical: 0, high: 0, medium: 0, low: 0 }
  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  data.value.data.forEach(sys => {
    if (sys.businessCriticality === 'critical') counts.critical++
    else if (sys.businessCriticality === 'high') counts.high++
    else if (sys.businessCriticality === 'medium') counts.medium++
    else if (sys.businessCriticality === 'low') counts.low++
  })
  return counts
})

function getCriticalityVariant(criticality: string) {
  const variants: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error',
    high: 'warning',
    medium: 'success',
    low: 'neutral'
  }
  return variants[criticality] || 'neutral'
}

useHead({
  title: 'Systems - Polaris'
})
</script>
