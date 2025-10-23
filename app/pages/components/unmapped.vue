<template>
  <NuxtLayout name="default">
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Unmapped Components</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Components not yet mapped to technologies</p>
      </div>

      <UiCard v-if="pending">
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"/>
          <p class="mt-4 text-gray-600 dark:text-gray-300">Loading unmapped components...</p>
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
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 dark:text-gray-300">Total Unmapped</p>
              <p class="mt-1 text-3xl font-bold text-warning-600 dark:text-warning-400">{{ data.count }}</p>
            </div>
            <div v-if="data.count === 0" class="flex-shrink-0 w-16 h-16 rounded-full bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
              <svg class="w-8 h-8 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </UiCard>

        <UiCard v-if="data.count === 0">
          <div class="text-center py-8">
            <svg class="mx-auto h-12 w-12 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="mt-4 text-lg font-semibold text-gray-900 dark:text-white">All Components Mapped!</h3>
            <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Every component has been mapped to a technology.</p>
          </div>
        </UiCard>

        <UiCard v-else>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Component</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">System</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="component in data.data" :key="component.name" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900 dark:text-white">{{ component.name }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-600 dark:text-gray-300">{{ component.system }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <UiBadge variant="warning" size="sm">Unmapped</UiBadge>
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
const { data, pending, error } = await useFetch('/api/components/unmapped')
useHead({ title: 'Unmapped Components - Polaris' })
</script>
