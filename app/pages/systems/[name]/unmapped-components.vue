<template>
  <div>
    <div class="mb-6">
      <NuxtLink to="/systems" class="text-blue-600 hover:text-blue-800 hover:underline">
        ← Back to Systems
      </NuxtLink>
    </div>

    <h1 class="text-3xl font-bold mb-2">Unmapped Components</h1>
    <p v-if="data?.data?.system" class="text-xl text-gray-600 mb-6">
      System: <span class="font-semibold">{{ data.data.system }}</span>
    </p>
    
    <div v-if="pending" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"/>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p class="text-red-800">Error loading unmapped components: {{ error.message }}</p>
    </div>

    <div v-else-if="data">
      <div class="mb-6">
        <p class="text-gray-600">
          Components in this system that are not mapped to any technology.
          Total: <span class="font-semibold">{{ data.data.count }}</span>
        </p>
      </div>

      <div v-if="data.data.count === 0" class="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <p class="text-green-800 text-lg">✅ All components in this system are mapped to technologies!</p>
      </div>

      <div v-else class="bg-white shadow-md rounded-lg overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Version
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Package Manager
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                License
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="component in data.data.components" :key="component.hash" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ component.name }}</div>
                <div v-if="component.importPath" class="text-xs text-gray-500">{{ component.importPath }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ component.version || 'N/A' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ component.packageManager || 'N/A' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ component.license || 'N/A' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <a 
                  v-if="component.sourceRepo" 
                  :href="component.sourceRepo" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Repository
                </a>
                <span v-else class="text-gray-400">N/A</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const systemName = route.params.name as string

const { data, pending, error } = await useFetch(`/api/systems/${encodeURIComponent(systemName)}/unmapped-components`)

useHead({
  title: `Unmapped Components - ${systemName} - Polaris`
})
</script>
