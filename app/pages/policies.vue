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
          Policies
        </h1>
        <p class="text-gray-600">
          Governance and compliance rules
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="pending" class="bg-white rounded-lg shadow p-8 text-center">
        <div class="text-4xl mb-4">
          ⏳
        </div>
        <p class="text-gray-600">
          Loading policies...
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
              Error Loading Policies
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
              No Policies Found
            </h3>
            <p class="text-sm text-yellow-700">
              The database appears to be empty. Try running: <code class="bg-yellow-100 px-2 py-1 rounded">npm run seed</code>
            </p>
          </div>
        </div>
      </div>

      <!-- Policies List -->
      <div v-else>
        <!-- Summary -->
        <div class="bg-white rounded-lg shadow p-6 mb-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold text-gray-900">
                Total Policies
              </h2>
              <p class="text-3xl font-bold text-blue-600">
                {{ data.count }}
              </p>
            </div>
            <div class="text-right">
              <div class="text-sm text-gray-600">
                Severity Breakdown
              </div>
              <div class="flex gap-4 mt-2">
                <div>
                  <span class="text-xs text-gray-500">Critical:</span>
                  <span class="ml-1 font-semibold text-red-600">{{ severityCounts.critical }}</span>
                </div>
                <div>
                  <span class="text-xs text-gray-500">Error:</span>
                  <span class="ml-1 font-semibold text-orange-600">{{ severityCounts.error }}</span>
                </div>
                <div>
                  <span class="text-xs text-gray-500">Warning:</span>
                  <span class="ml-1 font-semibold text-yellow-600">{{ severityCounts.warning }}</span>
                </div>
                <div>
                  <span class="text-xs text-gray-500">Info:</span>
                  <span class="ml-1 font-semibold text-blue-600">{{ severityCounts.info }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Policies List -->
        <div class="space-y-4">
          <div
            v-for="policy in data.data"
            :key="policy.name"
            class="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
          >
            <!-- Header -->
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h3 class="text-xl font-bold text-gray-900">
                    {{ policy.name }}
                  </h3>
                  <span
                    :class="[
                      'px-3 py-1 rounded-full text-xs font-semibold',
                      policy.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      policy.severity === 'error' ? 'bg-orange-100 text-orange-800' :
                      policy.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      policy.severity === 'info' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    ]"
                  >
                    {{ policy.severity }}
                  </span>
                  <span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                    {{ policy.ruleType }}
                  </span>
                </div>
                <p class="text-gray-600 text-sm">
                  {{ policy.description }}
                </p>
              </div>
            </div>

            <!-- Technologies -->
            <div v-if="policy.technologies && policy.technologies.length > 0" class="pt-4 border-t border-gray-200">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-sm text-gray-500">Applies to:</span>
                <span class="text-sm font-medium text-gray-700">{{ policy.technologyCount }} technologies</span>
              </div>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="tech in policy.technologies"
                  :key="tech"
                  class="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
                >
                  {{ tech }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Policy {
  name: string
  description: string
  ruleType: string
  severity: string
  technologyCount: number
  technologies: string[]
}

interface PoliciesResponse {
  success: boolean
  data: Policy[]
  count: number
  error?: string
}

const { data, pending, error } = await useFetch<PoliciesResponse>('/api/policies')

const severityCounts = computed(() => {
  if (!data.value?.data) return { critical: 0, error: 0, warning: 0, info: 0 }
  const counts = { critical: 0, error: 0, warning: 0, info: 0 }
  data.value.data.forEach(policy => {
    if (policy.severity === 'critical') counts.critical++
    else if (policy.severity === 'error') counts.error++
    else if (policy.severity === 'warning') counts.warning++
    else if (policy.severity === 'info') counts.info++
  })
  return counts
})

useHead({
  title: 'Policies - Polaris'
})
</script>
