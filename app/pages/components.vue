<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center gap-4 mb-4">
          <NuxtLink to="/" class="text-blue-600 hover:text-blue-800">
            ← Back to Home
          </NuxtLink>
        </div>
        <h1 class="text-4xl font-bold text-gray-900 mb-2">
          Components
        </h1>
        <p class="text-gray-600">
          Software artifacts discovered in systems through SBOM scanning
        </p>
        <div class="mt-4 bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
          <p class="text-sm text-purple-900">
            <strong>What is a Component?</strong> Components are actual software packages and dependencies 
            (e.g., npm packages, Python libraries) discovered in your systems. They may implement governed 
            Technologies or be transitive dependencies. Components are tracked for compliance, security, and licensing.
          </p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="pending" class="bg-white rounded-lg shadow p-8 text-center">
        <div class="text-4xl mb-4">
          ⏳
        </div>
        <p class="text-gray-600">
          Loading components...
        </p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border-l-4 border-red-500 rounded-lg shadow p-6">
        <div class="flex items-center gap-3">
          <div class="text-3xl">
            ❌
          </div>
          <div>
            <h3 class="text-lg font-semibold text-red-900">
              Error Loading Components
            </h3>
            <p class="text-sm text-red-700">
              {{ error.message }}
            </p>
          </div>
        </div>
      </div>

      <!-- No Data State -->
      <div v-else-if="!data?.data || data.data.length === 0" class="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg shadow p-6">
        <div class="flex items-center gap-3">
          <div class="text-3xl">
            ⚠️
          </div>
          <div>
            <h3 class="text-lg font-semibold text-yellow-900">
              No Components Found
            </h3>
            <p class="text-sm text-yellow-700">
              The database appears to be empty. Try running: <code class="bg-yellow-100 px-2 py-1 rounded">npm run seed</code>
            </p>
          </div>
        </div>
      </div>

      <!-- Components List -->
      <div v-else>
        <!-- Summary -->
        <div class="bg-white rounded-lg shadow p-6 mb-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold text-gray-900">
                Total Components
              </h2>
              <p class="text-3xl font-bold text-blue-600">
                {{ data.count }}
              </p>
            </div>
            <div class="text-right">
              <div class="text-sm text-gray-600">
                Package Managers
              </div>
              <div class="flex gap-4 mt-2">
                <div v-for="(count, pm) in packageManagerCounts" :key="pm">
                  <span class="text-xs text-gray-500">{{ pm }}:</span>
                  <span class="ml-1 font-semibold text-blue-600">{{ count }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter by Package Manager -->
        <div class="bg-white rounded-lg shadow p-4 mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Filter by Package Manager</label>
          <div class="flex flex-wrap gap-2">
            <button
              :class="[
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                selectedPackageManager === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
              @click="selectedPackageManager = null"
            >
              All ({{ data.count }})
            </button>
            <button
              v-for="pm in packageManagers"
              :key="pm"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                selectedPackageManager === pm
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
              @click="selectedPackageManager = pm"
            >
              {{ pm }} ({{ packageManagerCounts[pm] }})
            </button>
          </div>
        </div>

        <!-- Components Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="component in filteredComponents"
            :key="`${component.name}-${component.version}-${component.packageManager}`"
            class="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
          >
            <!-- Header -->
            <div class="mb-4">
              <h3 class="text-xl font-bold text-gray-900 mb-1">
                {{ component.name }}
              </h3>
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-500">v{{ component.version }}</span>
                <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                  {{ component.packageManager }}
                </span>
              </div>
            </div>

            <!-- Details -->
            <div class="space-y-2 text-sm">
              <div v-if="component.license">
                <span class="text-gray-500">License:</span>
                <span class="ml-2 font-medium text-gray-900">{{ component.license }}</span>
              </div>

              <div v-if="component.technologyName">
                <span class="text-gray-500">Technology:</span>
                <span class="ml-2 font-medium text-gray-900">{{ component.technologyName }}</span>
              </div>

              <div>
                <span class="text-gray-500">Used by:</span>
                <span class="ml-2 font-medium text-gray-900">{{ component.systemCount }} systems</span>
              </div>

              <div v-if="component.sourceRepo" class="pt-2">
                <a
                  :href="component.sourceRepo"
                  target="_blank"
                  class="text-blue-600 hover:text-blue-800 text-xs"
                >
                  View Repository →
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty Filter State -->
        <div v-if="filteredComponents.length === 0" class="bg-gray-50 rounded-lg p-8 text-center">
          <p class="text-gray-600">
            No components found for "{{ selectedPackageManager }}" package manager.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Component {
  name: string
  version: string
  packageManager: string
  license: string
  sourceRepo: string
  importPath: string
  hash: string
  technologyName: string | null
  systemCount: number
}

interface ComponentsResponse {
  success: boolean
  data: Component[]
  count: number
  error?: string
}

const { data, pending, error } = await useFetch<ComponentsResponse>('/api/components')

const selectedPackageManager = ref<string | null>(null)

const packageManagers = computed(() => {
  if (!data.value?.data) return []
  const pms = new Set(data.value.data.map(c => c.packageManager))
  return Array.from(pms).sort()
})

const packageManagerCounts = computed(() => {
  if (!data.value?.data) return {}
  const counts: Record<string, number> = {}
  data.value.data.forEach(comp => {
    counts[comp.packageManager] = (counts[comp.packageManager] || 0) + 1
  })
  return counts
})

const filteredComponents = computed(() => {
  if (!data.value?.data) return []
  if (!selectedPackageManager.value) return data.value.data
  return data.value.data.filter(c => c.packageManager === selectedPackageManager.value)
})

useHead({
  title: 'Components - Polaris'
})
</script>
