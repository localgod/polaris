<template>
  <NuxtLayout name="default">
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Components</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">SBOM entries and dependency information</p>
      </div>

      <UiCard v-if="pending">
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"/>
          <p class="mt-4 text-gray-600 dark:text-gray-300">Loading components...</p>
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
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UiCard>
            <div class="text-center">
              <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Total Components</p>
              <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{{ data.count }}</p>
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

        <UiCard>
          <template #header>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Recent Components</h3>
          </template>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Version</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Package Manager</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">License</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="comp in data.data.slice(0, 10)" :key="comp.hash" class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{{ comp.name }}</td>
                  <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{{ comp.version }}</td>
                  <td class="px-6 py-4"><UiBadge v-if="comp.packageManager" variant="neutral" size="sm">{{ comp.packageManager }}</UiBadge></td>
                  <td class="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{{ comp.license || 'N/A' }}</td>
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
const { data, pending, error } = await useFetch('/api/components')
useHead({ title: 'Components - Polaris' })
</script>
