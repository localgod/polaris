<template>
  <NuxtLayout name="default">
    <div class="space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Technologies</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Approved technologies and their versions
        </p>
      </div>

      <!-- Loading/Error States -->
      <UiCard v-if="pending">
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"/>
          <p class="mt-4 text-gray-600 dark:text-gray-300">Loading technologies...</p>
        </div>
      </UiCard>

      <UiCard v-else-if="error">
        <div class="flex items-center gap-4 text-error-600 dark:text-error-400">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 class="text-lg font-semibold">Error Loading Technologies</h3>
            <p class="text-sm">{{ error.message }}</p>
          </div>
        </div>
      </UiCard>

      <!-- Content -->
      <template v-else-if="data?.data">
        <!-- Summary -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <UiCard>
            <div class="text-center">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Total Technologies</p>
              <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{{ data.count }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Categories</p>
              <p class="mt-2 text-3xl font-bold text-primary-600 dark:text-primary-400">{{ uniqueCategories.length }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Vendors</p>
              <p class="mt-2 text-3xl font-bold text-success-600 dark:text-success-400">{{ uniqueVendors.length }}</p>
            </div>
          </UiCard>
        </div>

        <!-- Technologies Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <UiCard v-for="tech in data.data" :key="tech.name">
            <template #header>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ tech.name }}</h3>
                <p v-if="tech.vendor" class="text-sm text-gray-500 dark:text-gray-300">{{ tech.vendor }}</p>
              </div>
            </template>

            <div class="space-y-3">
              <div v-if="tech.category" class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-300">Category</span>
                <UiBadge variant="neutral" size="sm">{{ tech.category }}</UiBadge>
              </div>
              
              <div v-if="tech.approvedVersionRange" class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-300">Version Range</span>
                <code class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{{ tech.approvedVersionRange }}</code>
              </div>
              
              <div v-if="tech.ownerTeam" class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-300">Owner</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ tech.ownerTeam }}</span>
              </div>
            </div>

            <template #footer>
              <NuxtLink 
                :to="`/technologies/${encodeURIComponent(tech.name)}`"
                class="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 inline-flex items-center gap-2"
              >
                View Details
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </NuxtLink>
            </template>
          </UiCard>
        </div>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
const { data, pending, error } = await useFetch('/api/technologies')

interface Technology {
  category?: string
  vendor?: string
}

const uniqueCategories = computed(() => {
  if (!data.value?.data) return []
  return [...new Set(data.value.data.map((t: Technology) => t.category).filter(Boolean))]
})

const uniqueVendors = computed(() => {
  if (!data.value?.data) return []
  return [...new Set(data.value.data.map((t: Technology) => t.vendor).filter(Boolean))]
})

useHead({
  title: 'Technologies - Polaris'
})
</script>
