<template>
  <NuxtLayout name="default">
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">License Inventory</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Licenses discovered in components across all systems</p>
      </div>

      <!-- Filters -->
      <UiCard>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
            <select
              v-model="filters.category"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              @change="applyFilters"
            >
              <option value="">All</option>
              <option value="permissive">Permissive</option>
              <option value="copyleft">Copyleft</option>
              <option value="proprietary">Proprietary</option>
              <option value="public-domain">Public Domain</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">OSI Approved</label>
            <select
              v-model="filters.osiApproved"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              @change="applyFilters"
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
            <input
              v-model="filters.search"
              type="text"
              placeholder="Search licenses..."
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              @input="debouncedFilter"
            >
          </div>
        </div>
      </UiCard>

      <UiCard v-if="pending || statsPending">
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"/>
          <p class="mt-4 text-gray-600 dark:text-gray-300">Loading licenses...</p>
        </div>
      </UiCard>

      <UiCard v-else-if="error || statsError">
        <div class="flex items-center gap-4 text-error-600 dark:text-error-400">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div>
            <h3 class="text-lg font-semibold">Error</h3>
            <p class="text-sm">{{ error?.message || statsError?.message }}</p>
          </div>
        </div>
      </UiCard>

      <template v-else-if="data && stats">
        <!-- Statistics Cards -->
        <div class="grid grid-cols-1 md:grid-cols-5 gap-6">
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-gray-600 dark:text-gray-300">Total Licenses</p>
              <p class="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{{ stats.data[0]?.total || 0 }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-gray-600 dark:text-gray-300">Permissive</p>
              <p class="mt-1 text-3xl font-bold text-success-600 dark:text-success-400">{{ stats.data[0]?.byCategory?.permissive || 0 }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-gray-600 dark:text-gray-300">Copyleft</p>
              <p class="mt-1 text-3xl font-bold text-warning-600 dark:text-warning-400">{{ stats.data[0]?.byCategory?.copyleft || 0 }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-gray-600 dark:text-gray-300">OSI Approved</p>
              <p class="mt-1 text-3xl font-bold text-primary-600 dark:text-primary-400">{{ stats.data[0]?.osiApproved || 0 }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-gray-600 dark:text-gray-300">Showing</p>
              <p class="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{{ data.count }}</p>
            </div>
          </UiCard>
        </div>

        <!-- Licenses Table -->
        <UiCard>
          <template #header>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Licenses</h3>
          </template>
          
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">License</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">SPDX ID</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Category</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">OSI</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Components</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="license in data.data" :key="license.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="px-6 py-4">
                    <div class="text-sm font-medium text-gray-900 dark:text-white">{{ license.name }}</div>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-mono">{{ license.spdxId }}</td>
                  <td class="px-6 py-4">
                    <UiBadge 
                      v-if="license.category" 
                      :variant="getCategoryVariant(license.category)" 
                      size="sm"
                    >
                      {{ license.category }}
                    </UiBadge>
                    <span v-else class="text-xs text-gray-400">N/A</span>
                  </td>
                  <td class="px-6 py-4">
                    <UiBadge 
                      v-if="license.osiApproved !== null" 
                      :variant="license.osiApproved ? 'success' : 'neutral'" 
                      size="sm"
                    >
                      {{ license.osiApproved ? 'Yes' : 'No' }}
                    </UiBadge>
                    <span v-else class="text-xs text-gray-400">N/A</span>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-900 dark:text-white">{{ license.componentCount || 0 }}</td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <button
                        v-if="isDenied(license.id)"
                        class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400 hover:bg-error-200 dark:hover:bg-error-900/50 transition-colors"
                        :disabled="togglingLicense === license.id"
                        @click="allowLicense(license.id)"
                      >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        {{ togglingLicense === license.id ? '...' : 'Denied' }}
                      </button>
                      <button
                        v-else
                        class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-error-100 hover:text-error-700 dark:hover:bg-error-900/30 dark:hover:text-error-400 transition-colors"
                        :disabled="togglingLicense === license.id"
                        @click="denyLicense(license.id)"
                      >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        {{ togglingLicense === license.id ? '...' : 'Deny' }}
                      </button>
                      <a 
                        v-if="license.url" 
                        :href="license.url" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        View
                      </a>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </UiCard>

        <!-- Denied Licenses Summary -->
        <UiCard v-if="deniedLicenses.length > 0">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Denied Licenses</h3>
              <UiBadge variant="error" size="sm">{{ deniedLicenses.length }}</UiBadge>
            </div>
          </template>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="licenseId in deniedLicenses"
              :key="licenseId"
              class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400 text-sm"
            >
              {{ licenseId }}
              <button
                class="ml-1 hover:text-error-900 dark:hover:text-error-200"
                @click="allowLicense(licenseId)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          </div>
          <p class="mt-3 text-sm text-gray-600 dark:text-gray-400">
            Components using these licenses will appear as violations in 
            <NuxtLink to="/violations/licenses" class="text-primary-600 dark:text-primary-400 hover:underline">License Violations</NuxtLink>.
          </p>
        </UiCard>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()

const filters = reactive({
  category: (route.query.category as string) || '',
  osiApproved: (route.query.osiApproved as string) || '',
  search: (route.query.search as string) || ''
})

const queryParams = computed(() => ({
  category: filters.category || undefined,
  osiApproved: filters.osiApproved || undefined,
  search: filters.search || undefined
}))

const { data, pending, error } = await useFetch('/api/licenses', {
  query: queryParams,
  watch: [queryParams]
})

const { data: stats, pending: statsPending, error: statsError } = await useFetch('/api/licenses/statistics')

// Denied licenses management
const deniedLicenses = ref<string[]>([])
const togglingLicense = ref<string | null>(null)

// Fetch denied licenses on mount
const { data: deniedData } = await useFetch<{ deniedLicenses: string[] }>('/api/licenses/denied')
if (deniedData.value) {
  deniedLicenses.value = deniedData.value.deniedLicenses
}

function isDenied(licenseId: string): boolean {
  return deniedLicenses.value.includes(licenseId)
}

async function denyLicense(licenseId: string) {
  togglingLicense.value = licenseId
  try {
    const result = await $fetch<{ success: boolean; deniedLicenses: string[] }>(`/api/licenses/${encodeURIComponent(licenseId)}/deny`, {
      method: 'POST'
    })
    if (result.success && result.deniedLicenses) {
      deniedLicenses.value = result.deniedLicenses
    }
  } catch (err) {
    console.error('Failed to deny license:', err)
    alert('Failed to deny license. Please try again.')
  } finally {
    togglingLicense.value = null
  }
}

async function allowLicense(licenseId: string) {
  togglingLicense.value = licenseId
  try {
    const result = await $fetch<{ success: boolean; deniedLicenses: string[] }>(`/api/licenses/${encodeURIComponent(licenseId)}/allow`, {
      method: 'POST'
    })
    if (result.success && result.deniedLicenses) {
      deniedLicenses.value = result.deniedLicenses
    }
  } catch (err) {
    console.error('Failed to allow license:', err)
    alert('Failed to allow license. Please try again.')
  } finally {
    togglingLicense.value = null
  }
}

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
      category: filters.category || undefined,
      osiApproved: filters.osiApproved || undefined,
      search: filters.search || undefined
    }
  })
}

const getCategoryVariant = (category: string) => {
  switch (category) {
    case 'permissive': return 'success'
    case 'copyleft': return 'warning'
    case 'proprietary': return 'error'
    case 'public-domain': return 'primary'
    default: return 'neutral'
  }
}

useHead({ title: 'Licenses - Polaris' })
</script>
