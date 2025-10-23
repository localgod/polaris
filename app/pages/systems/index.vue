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
          Systems
        </h1>
        <p class="text-gray-600">
          Deployable applications and services
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="pending" class="bg-white rounded-lg shadow p-8 text-center">
        <div class="text-4xl mb-4">
          ⏳
        </div>
        <p class="text-gray-600">
          Loading systems...
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
              Error Loading Systems
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
              No Systems Found
            </h3>
            <p class="text-sm text-yellow-700">
              The database appears to be empty. Try running: <code class="bg-yellow-100 px-2 py-1 rounded">npm run seed</code>
            </p>
          </div>
        </div>
      </div>

      <!-- Systems List -->
      <div v-else>
        <!-- Summary -->
        <div class="bg-white rounded-lg shadow p-6 mb-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold text-gray-900">
                Total Systems
              </h2>
              <p class="text-3xl font-bold text-blue-600">
                {{ data.count }}
              </p>
            </div>
            <div class="text-right">
              <div class="text-sm text-gray-600">
                Criticality Breakdown
              </div>
              <div class="flex gap-4 mt-2">
                <div>
                  <span class="text-xs text-gray-500">Critical:</span>
                  <span class="ml-1 font-semibold text-red-600">{{ criticalityCounts.critical }}</span>
                </div>
                <div>
                  <span class="text-xs text-gray-500">High:</span>
                  <span class="ml-1 font-semibold text-orange-600">{{ criticalityCounts.high }}</span>
                </div>
                <div>
                  <span class="text-xs text-gray-500">Medium:</span>
                  <span class="ml-1 font-semibold text-yellow-600">{{ criticalityCounts.medium }}</span>
                </div>
                <div>
                  <span class="text-xs text-gray-500">Low:</span>
                  <span class="ml-1 font-semibold text-green-600">{{ criticalityCounts.low }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Systems Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="system in data.data"
            :key="system.name"
            class="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
          >
            <!-- Header -->
            <div class="flex items-start justify-between mb-4">
              <div>
                <h3 class="text-xl font-bold text-gray-900">
                  {{ system.name }}
                </h3>
                <p class="text-sm text-gray-500">
                  {{ system.domain }}
                </p>
              </div>
              <span
                :class="[
                  'px-3 py-1 rounded-full text-xs font-semibold',
                  system.businessCriticality === 'critical' ? 'bg-red-100 text-red-800' :
                  system.businessCriticality === 'high' ? 'bg-orange-100 text-orange-800' :
                  system.businessCriticality === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  system.businessCriticality === 'low' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                ]"
              >
                {{ system.businessCriticality }}
              </span>
            </div>

            <!-- Details -->
            <div class="space-y-2 text-sm">
              <div>
                <span class="text-gray-500">Environment:</span>
                <span class="ml-2 font-medium text-gray-900">{{ system.environment }}</span>
              </div>

              <div v-if="system.ownerTeam">
                <span class="text-gray-500">Owner:</span>
                <span class="ml-2 font-medium text-gray-900">{{ system.ownerTeam }}</span>
              </div>

              <div>
                <span class="text-gray-500">Dependencies:</span>
                <span class="ml-2 font-medium text-gray-900">{{ system.componentCount }} components</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="mt-4 pt-4 border-t border-gray-200">
              <NuxtLink 
                :to="`/systems/${encodeURIComponent(system.name)}/unmapped-components`"
                class="inline-block text-sm text-yellow-600 hover:text-yellow-800 hover:underline font-medium"
                @click.stop
              >
                🔍 View unmapped components
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface System {
  name: string
  domain: string
  ownerTeam: string
  businessCriticality: string
  environment: string
  ownerTeamName: string | null
  componentCount: number
}

interface SystemsResponse {
  success: boolean
  data: System[]
  count: number
  error?: string
}

const { data, pending, error } = await useFetch<SystemsResponse>('/api/systems')

const criticalityCounts = computed(() => {
  if (!data.value?.data) return { critical: 0, high: 0, medium: 0, low: 0 }
  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  data.value.data.forEach(sys => {
    if (sys.businessCriticality === 'critical') counts.critical++
    else if (sys.businessCriticality === 'high') counts.high++
    else if (sys.businessCriticality === 'medium') counts.medium++
    else if (sys.businessCriticality === 'low') counts.low++
  })
  return counts
})

useHead({
  title: 'Systems - Polaris'
})
</script>
