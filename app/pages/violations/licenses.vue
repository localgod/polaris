<template>
  <NuxtLayout name="default">
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">License Compliance Violations</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Components using licenses not allowed by policies</p>
      </div>

      <!-- Filters -->
      <UiCard>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Severity</label>
            <select
              v-model="filters.severity"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              @change="applyFilters"
            >
              <option value="">All</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Team</label>
            <input
              v-model="filters.team"
              type="text"
              placeholder="Filter by team..."
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              @input="debouncedFilter"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">System</label>
            <input
              v-model="filters.system"
              type="text"
              placeholder="Filter by system..."
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              @input="debouncedFilter"
            >
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">License</label>
            <input
              v-model="filters.license"
              type="text"
              placeholder="Filter by license..."
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              @input="debouncedFilter"
            >
          </div>
        </div>
      </UiCard>

      <UiCard v-if="pending">
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"/>
          <p class="mt-4 text-gray-600 dark:text-gray-300">Loading violations...</p>
        </div>
      </UiCard>

      <UiCard v-else-if="error">
        <div class="flex items-center gap-4 text-error-600 dark:text-error-400">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div>
            <h3 class="text-lg font-semibold">Error</h3>
            <p class="text-sm">{{ error.message }}</p>
          </div>
        </div>
      </UiCard>

      <template v-else-if="data">
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-gray-600 dark:text-gray-300">Total Violations</p>
              <p class="mt-1 text-3xl font-bold text-error-600 dark:text-error-400">{{ data.count }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-gray-600 dark:text-gray-300">Critical</p>
              <p class="mt-1 text-3xl font-bold text-error-700 dark:text-error-300">{{ data.summary?.critical || 0 }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-gray-600 dark:text-gray-300">Errors</p>
              <p class="mt-1 text-3xl font-bold text-error-600 dark:text-error-400">{{ data.summary?.error || 0 }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-gray-600 dark:text-gray-300">Warnings</p>
              <p class="mt-1 text-3xl font-bold text-warning-600 dark:text-warning-400">{{ data.summary?.warning || 0 }}</p>
            </div>
          </UiCard>
        </div>

        <!-- No Violations -->
        <UiCard v-if="data.count === 0">
          <div class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <h3 class="mt-2 text-lg font-medium text-gray-900 dark:text-white">No License Violations</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">All components are using approved licenses</p>
          </div>
        </UiCard>

        <!-- Violations Table -->
        <UiCard v-else>
          <template #header>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">License Violations</h3>
          </template>
          
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Severity</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Team</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">System</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Component</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">License</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Policy</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="violation in data.data" :key="`${violation.system}-${violation.component.name}-${violation.license.id}`" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="px-6 py-4">
                    <UiBadge 
                      :variant="getSeverityVariant(violation.policy.severity)" 
                      size="sm"
                    >
                      {{ violation.policy.severity }}
                    </UiBadge>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-900 dark:text-white">{{ violation.team }}</td>
                  <td class="px-6 py-4 text-sm text-gray-900 dark:text-white">{{ violation.system }}</td>
                  <td class="px-6 py-4">
                    <div class="text-sm font-medium text-gray-900 dark:text-white">{{ violation.component.name }}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">{{ violation.component.version }}</div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="text-sm font-medium text-gray-900 dark:text-white">{{ violation.license.name }}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      {{ violation.license.id }}
                      <UiBadge v-if="violation.license.category" variant="neutral" size="sm" class="ml-1">
                        {{ violation.license.category }}
                      </UiBadge>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="text-sm font-medium text-gray-900 dark:text-white">{{ violation.policy.name }}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">{{ violation.policy.description }}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UiCard>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()

const filters = reactive({
  severity: (route.query.severity as string) || '',
  team: (route.query.team as string) || '',
  system: (route.query.system as string) || '',
  license: (route.query.license as string) || ''
})

const queryParams = computed(() => ({
  severity: filters.severity || undefined,
  team: filters.team || undefined,
  system: filters.system || undefined,
  license: filters.license || undefined
}))

const { data, pending, error } = await useFetch('/api/policies/license-violations', {
  query: queryParams,
  watch: [queryParams]
})

let filterTimeout: NodeJS.Timeout
const debouncedFilter = () => {
  clearTimeout(filterTimeout)
  filterTimeout = setTimeout(() => {
    applyFilters()
  }, 300)
}

const applyFilters = () => {
  router.push({
    query: {
      severity: filters.severity || undefined,
      team: filters.team || undefined,
      system: filters.system || undefined,
      license: filters.license || undefined
    }
  })
}

const getSeverityVariant = (severity: string) => {
  switch (severity) {
    case 'critical': return 'error'
    case 'error': return 'error'
    case 'warning': return 'warning'
    case 'info': return 'neutral'
    default: return 'neutral'
  }
}

useHead({ title: 'License Violations - Polaris' })
</script>
