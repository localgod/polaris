<template>
  <NuxtLayout name="default">
    <div class="space-y-6">
      <!-- Header -->
      <div>
        <NuxtLink to="/systems" class="inline-flex items-center text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mb-4">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Systems
        </NuxtLink>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Unmapped Components</h1>
        <p v-if="data?.data?.system" class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          System: <span class="font-semibold">{{ data.data.system }}</span>
        </p>
      </div>

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
            <h3 class="text-lg font-semibold">Error Loading Components</h3>
            <p class="text-sm">{{ error.message }}</p>
          </div>
        </div>
      </UiCard>

      <!-- Content -->
      <template v-else-if="data">
        <!-- Summary -->
        <UiCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-300">Components not mapped to technologies</p>
              <p class="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{{ data.data.count }}</p>
            </div>
            <div v-if="data.data.count === 0" class="flex-shrink-0 w-16 h-16 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
              <svg class="w-8 h-8 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </UiCard>

        <!-- Success Message -->
        <UiCard v-if="data.data.count === 0">
          <div class="text-center py-8">
            <svg class="mx-auto h-12 w-12 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="mt-4 text-lg font-semibold text-gray-900 dark:text-white">All Components Mapped!</h3>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
              All components in this system are mapped to technologies.
            </p>
          </div>
        </UiCard>

        <!-- Components Table -->
        <UiCard v-else>
          <template #header>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Unmapped Components</h3>
          </template>
          
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Version
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Package Manager
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    License
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="component in data.data.components" :key="component.hash" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900 dark:text-white">{{ component.name }}</div>
                    <div v-if="component.importPath" class="text-xs text-gray-500 dark:text-gray-300">{{ component.importPath }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {{ component.version || 'N/A' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <UiBadge v-if="component.packageManager" variant="neutral" size="sm">
                      {{ component.packageManager }}
                    </UiBadge>
                    <span v-else class="text-sm text-gray-400">N/A</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {{ component.license || 'N/A' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <a 
                      v-if="component.sourceRepo" 
                      :href="component.sourceRepo" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      class="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 inline-flex items-center gap-1"
                    >
                      Repository
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    <span v-else class="text-gray-400">N/A</span>
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
import type { UnmappedComponent } from '~~/types/api'

const route = useRoute()
const systemName = route.params.name as string

interface SystemUnmappedResponse {
  success: boolean
  data: {
    system: string
    components: UnmappedComponent[]
    count: number
  }
  error?: string
}

const { data, pending, error } = await useFetch<SystemUnmappedResponse>(`/api/systems/${encodeURIComponent(systemName)}/unmapped-components`)

useHead({
  title: `Unmapped Components - ${systemName} - Polaris`
})
</script>
