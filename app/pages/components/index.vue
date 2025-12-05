<template>
  <NuxtLayout name="default">
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Components</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">SBOM entries and dependency information</p>
      </div>

      <!-- Search and Filters -->
      <UiCard>
        <div class="space-y-4">
          <!-- Search Input -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Components
            </label>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by name or package URL..."
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              @input="debouncedSearch"
            >
          </div>

          <!-- Filters Row -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Package Manager Filter -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Package Manager
              </label>
              <select
                v-model="filters.packageManager"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                @change="applyFilters"
              >
                <option value="">All</option>
                <option value="npm">npm</option>
                <option value="maven">Maven</option>
                <option value="pypi">PyPI</option>
                <option value="nuget">NuGet</option>
                <option value="cargo">Cargo</option>
              </select>
            </div>

            <!-- Type Filter -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                v-model="filters.type"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                @change="applyFilters"
              >
                <option value="">All</option>
                <option value="library">Library</option>
                <option value="framework">Framework</option>
                <option value="application">Application</option>
              </select>
            </div>

            <!-- License Filter -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                License Status
              </label>
              <select
                v-model="filters.hasLicense"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                @change="applyFilters"
              >
                <option value="">All</option>
                <option value="true">Has License</option>
                <option value="false">No License</option>
              </select>
            </div>
          </div>

          <!-- Active Filters Display -->
          <div v-if="hasActiveFilters" class="flex items-center gap-2 flex-wrap">
            <span class="text-sm text-gray-600 dark:text-gray-300">Active filters:</span>
            <UiBadge v-if="searchQuery" variant="primary" size="sm" class="cursor-pointer" @click="clearSearch">
              Search: "{{ searchQuery }}" ×
            </UiBadge>
            <UiBadge v-if="filters.packageManager" variant="neutral" size="sm" class="cursor-pointer" @click="filters.packageManager = ''; applyFilters()">
              {{ filters.packageManager }} ×
            </UiBadge>
            <UiBadge v-if="filters.type" variant="neutral" size="sm" class="cursor-pointer" @click="filters.type = ''; applyFilters()">
              {{ filters.type }} ×
            </UiBadge>
            <UiBadge v-if="filters.hasLicense" variant="neutral" size="sm" class="cursor-pointer" @click="filters.hasLicense = ''; applyFilters()">
              {{ filters.hasLicense === 'true' ? 'Has License' : 'No License' }} ×
            </UiBadge>
            <button
              class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              @click="clearAllFilters"
            >
              Clear all
            </button>
          </div>
        </div>
      </UiCard>

      <!-- Loading State -->
      <UiCard v-if="pending">
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"/>
          <p class="mt-4 text-gray-600 dark:text-gray-300">Loading components...</p>
        </div>
      </UiCard>

      <!-- Error State -->
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

      <!-- Results -->
      <template v-else-if="data">
        <!-- Summary Stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UiCard>
            <div class="text-center">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Showing</p>
              <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{{ data.count }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Total Components</p>
              <p class="mt-2 text-3xl font-bold text-primary-600 dark:text-primary-400">{{ data.total || data.count }}</p>
            </div>
          </UiCard>
          <NuxtLink to="/components/unmapped">
            <UiCard class="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] hover:border-warning-400 dark:hover:border-warning-600">
              <div class="text-center">
                <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Unmapped Components</p>
                <p class="mt-2 text-3xl font-bold text-warning-600 dark:text-warning-400 hover:text-warning-700 dark:hover:text-warning-300 transition-colors">View →</p>
              </div>
            </UiCard>
          </NuxtLink>
        </div>

        <!-- Components Table -->
        <UiCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Components ({{ currentPage * pageSize + 1 }}-{{ Math.min((currentPage + 1) * pageSize, data.total || data.count) }} of {{ data.total || data.count }})
              </h3>
            </div>
          </template>
          
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Version</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Package Manager</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Technology</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Licenses</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="comp in data.data" :key="comp.purl || comp.name" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{{ comp.name }}</td>
                  <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{{ comp.version }}</td>
                  <td class="px-6 py-4">
                    <UiBadge v-if="comp.type" variant="neutral" size="sm">{{ comp.type }}</UiBadge>
                    <span v-else class="text-xs text-gray-400">N/A</span>
                  </td>
                  <td class="px-6 py-4">
                    <UiBadge v-if="comp.packageManager" variant="primary" size="sm">{{ comp.packageManager }}</UiBadge>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {{ comp.technologyName || 'Unmapped' }}
                  </td>
                  <td class="px-6 py-4">
                    <div v-if="comp.licenses && comp.licenses.length > 0" class="flex flex-wrap gap-1">
                      <UiBadge v-for="license in comp.licenses" :key="license.id || license.name" variant="success" size="sm">
                        {{ license.id || license.name }}
                      </UiBadge>
                    </div>
                    <span v-else class="text-xs text-gray-400">N/A</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <template #footer>
            <div class="flex items-center justify-between px-6 py-4">
              <button
                :disabled="currentPage === 0"
                class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                @click="previousPage"
              >
                Previous
              </button>
              <span class="text-sm text-gray-600 dark:text-gray-300">
                Page {{ currentPage + 1 }} of {{ totalPages }}
              </span>
              <button
                :disabled="currentPage >= totalPages - 1"
                class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                @click="nextPage"
              >
                Next
              </button>
            </div>
          </template>
        </UiCard>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { ApiResponse, Component } from '~~/types/api'

const route = useRoute()
const router = useRouter()

// Reactive state
const searchQuery = ref((route.query.search as string) || '')
const filters = reactive({
  packageManager: (route.query.packageManager as string) || '',
  type: (route.query.type as string) || '',
  hasLicense: (route.query.hasLicense as string) || ''
})
const currentPage = ref(parseInt((route.query.page as string) || '0', 10))
const pageSize = 50

// Computed
const queryParams = computed(() => ({
  search: searchQuery.value || undefined,
  packageManager: filters.packageManager || undefined,
  type: filters.type || undefined,
  hasLicense: filters.hasLicense || undefined,
  limit: pageSize,
  offset: currentPage.value * pageSize
}))

const hasActiveFilters = computed(() => 
  searchQuery.value || filters.packageManager || filters.type || filters.hasLicense
)

// Fetch data with reactive query params
const { data, pending, error } = await useFetch<ApiResponse<Component>>('/api/components', {
  query: queryParams,
  watch: [queryParams]
})

const totalPages = computed(() => {
  if (!data.value?.total) return 1
  return Math.ceil(data.value.total / pageSize)
})

// Debounced search
let searchTimeout: NodeJS.Timeout
const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 0 // Reset to first page
    applyFilters()
  }, 300)
}

// Apply filters and update URL
const applyFilters = () => {
  router.push({
    query: {
      search: searchQuery.value || undefined,
      packageManager: filters.packageManager || undefined,
      type: filters.type || undefined,
      hasLicense: filters.hasLicense || undefined,
      page: currentPage.value || undefined
    }
  })
}

// Clear functions
const clearSearch = () => {
  searchQuery.value = ''
  applyFilters()
}

const clearAllFilters = () => {
  searchQuery.value = ''
  filters.packageManager = ''
  filters.type = ''
  filters.hasLicense = ''
  currentPage.value = 0
  applyFilters()
}

// Pagination
const nextPage = () => {
  if (currentPage.value < totalPages.value - 1) {
    currentPage.value++
    applyFilters()
  }
}

const previousPage = () => {
  if (currentPage.value > 0) {
    currentPage.value--
    applyFilters()
  }
}

useHead({ title: 'Components - Polaris' })
</script>
