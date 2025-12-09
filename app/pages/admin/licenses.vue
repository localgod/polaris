<template>
  <NuxtLayout name="default">
    <div class="container mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          License Whitelist Management
        </h1>
        <p class="text-gray-600 dark:text-gray-300">
          Manage globally approved licenses for your organization. Only superadmins can modify the whitelist.
        </p>
      </div>

      <!-- Statistics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8" v-if="statistics">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div class="flex items-center">
            <div class="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <svg class="w-6 h-6 text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ statistics.total }}</p>
              <p class="text-gray-600 dark:text-gray-300">Total Licenses</p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div class="flex items-center">
            <div class="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <svg class="w-6 h-6 text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ statistics.whitelisted }}</p>
              <p class="text-gray-600 dark:text-gray-300">Whitelisted</p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div class="flex items-center">
            <div class="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <svg class="w-6 h-6 text-yellow-600 dark:text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ statistics.total - statistics.whitelisted }}</p>
              <p class="text-gray-600 dark:text-gray-300">Not Whitelisted</p>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div class="flex items-center">
            <div class="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <svg class="w-6 h-6 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div class="ml-4">
              <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ statistics.osiApproved }}</p>
              <p class="text-gray-600 dark:text-gray-300">OSI Approved</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <UiCard class="mb-6">
        <template #header>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            Filters
          </h2>
        </template>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
            <select
              v-model="filters.category"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              @change="applyFilters"
            >
              <option value="">All Categories</option>
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
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Whitelist Status</label>
            <select
              v-model="filters.whitelisted"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              @change="applyFilters"
            >
              <option value="">All</option>
              <option value="true">Whitelisted</option>
              <option value="false">Not Whitelisted</option>
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

      <!-- Bulk Actions -->
      <div class="mb-6" v-if="selectedLicenses.length > 0">
        <UiCard>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-300">
              {{ selectedLicenses.length }} license(s) selected
            </span>
            <div class="space-x-2">
              <button
                @click="bulkUpdateWhitelist(true)"
                :disabled="updating"
                class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Whitelist Selected
              </button>
              <button
                @click="bulkUpdateWhitelist(false)"
                :disabled="updating"
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Remove from Whitelist
              </button>
              <button
                @click="selectedLicenses = []"
                class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </UiCard>
      </div>

      <!-- License Table -->
      <UiCard v-if="data">
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              Licenses ({{ data.count }})
            </h2>
            <div class="flex items-center space-x-2">
              <label class="flex items-center text-sm text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  :checked="allSelected"
                  @change="toggleSelectAll"
                  class="mr-2"
                >
                Select All
              </label>
            </div>
          </div>
        </template>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Select
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  License
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  OSI Approved
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Components
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Whitelist Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="license in data.data" :key="license.id" class="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td class="px-6 py-4">
                  <input
                    type="checkbox"
                    :value="license.id"
                    v-model="selectedLicenses"
                    class="rounded"
                  >
                </td>
                <td class="px-6 py-4">
                  <div>
                    <div class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ license.name }}
                    </div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                      {{ license.id }}
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span :class="getCategoryBadgeClasses(license.category)">
                    {{ license.category || 'Unknown' }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <span v-if="license.osiApproved" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Yes
                  </span>
                  <span v-else class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    No
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900 dark:text-white">
                  {{ license.componentCount || 0 }}
                </td>
                <td class="px-6 py-4">
                  <span v-if="license.whitelisted" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Whitelisted
                  </span>
                  <span v-else class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Not Whitelisted
                  </span>
                </td>
                <td class="px-6 py-4">
                  <button
                    @click="toggleLicenseWhitelist(license)"
                    :disabled="updating"
                    :class="license.whitelisted 
                      ? 'px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50'
                      : 'px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50'"
                  >
                    {{ license.whitelisted ? 'Remove' : 'Whitelist' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UiCard>

      <!-- Loading State -->
      <div v-if="pending" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-2 text-gray-600 dark:text-gray-300">Loading licenses...</span>
      </div>

      <!-- Error State -->
      <UiCard v-if="apiError">
        <div class="text-center py-12">
          <svg class="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">Error loading licenses</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ apiError }}</p>
          <button 
            @click="refresh()"
            class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </UiCard>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
// Require superuser access
definePageMeta({
  middleware: 'superuser'
})

// Page metadata
useHead({
  title: 'License Whitelist Management'
})

// Reactive state
const filters = reactive({
  category: '',
  osiApproved: '',
  whitelisted: '',
  search: ''
})

const selectedLicenses = ref<string[]>([])
const updating = ref(false)

// Query parameters
const queryParams = computed(() => ({
  category: filters.category || undefined,
  osiApproved: filters.osiApproved || undefined,
  whitelisted: filters.whitelisted || undefined,
  search: filters.search || undefined
}))

// Fetch data
const { data: rawData, pending, error, refresh } = await useFetch('/api/admin/licenses/whitelist', {
  query: queryParams,
  server: false // Client-side only for admin pages
})

// Computed properties
const data = computed(() => {
  if (!rawData.value || !rawData.value.success) return null
  return rawData.value
})

const apiError = computed(() => {
  if (error.value) return error.value
  if (rawData.value && !rawData.value.success) {
    return rawData.value.error || 'Unknown error'
  }
  return null
})
const statistics = computed(() => data.value?.statistics)

const allSelected = computed(() => {
  return data.value?.data?.length > 0 && selectedLicenses.value.length === data.value.data.length
})

// Methods
const applyFilters = () => {
  selectedLicenses.value = []
  refresh()
}

const debouncedFilter = useDebounceFn(() => {
  applyFilters()
}, 300)

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedLicenses.value = []
  } else {
    selectedLicenses.value = data.value?.data?.map(l => l.id) || []
  }
}

const getCategoryBadgeClasses = (category: string) => {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
  
  switch (category) {
    case 'permissive':
      return `${baseClasses} bg-green-100 text-green-800`
    case 'copyleft':
      return `${baseClasses} bg-blue-100 text-blue-800`
    case 'proprietary':
      return `${baseClasses} bg-red-100 text-red-800`
    case 'public-domain':
      return `${baseClasses} bg-purple-100 text-purple-800`
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`
  }
}

const toggleLicenseWhitelist = async (license: any) => {
  updating.value = true
  
  try {
    const newStatus = !license.whitelisted
    
    const response = await $fetch('/api/admin/licenses/whitelist', {
      method: 'PUT',
      body: {
        licenseId: license.id,
        whitelisted: newStatus
      }
    })

    if (response.success) {
      // Update local state
      license.whitelisted = newStatus
      
      // Show success message
      // Note: You might want to add a toast/notification system here
      console.log(response.message)
      
      // Refresh statistics
      refresh()
    } else {
      throw new Error(response.message)
    }
  } catch (error) {
    console.error('Failed to update license whitelist status:', error)
    // Note: You might want to add error handling/notification here
  } finally {
    updating.value = false
  }
}

const bulkUpdateWhitelist = async (whitelisted: boolean) => {
  if (selectedLicenses.value.length === 0) return
  
  updating.value = true
  
  try {
    const response = await $fetch('/api/admin/licenses/whitelist', {
      method: 'PUT',
      body: {
        licenseIds: selectedLicenses.value,
        whitelisted
      }
    })

    if (response.success) {
      // Clear selection
      selectedLicenses.value = []
      
      // Show success message
      console.log(response.message)
      
      // Refresh data
      refresh()
    } else {
      throw new Error(response.message)
    }
  } catch (error) {
    console.error('Failed to bulk update license whitelist status:', error)
  } finally {
    updating.value = false
  }
}
</script>