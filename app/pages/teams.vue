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
          Teams
        </h1>
        <p class="text-gray-600">
          Organizational teams and their responsibilities
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="pending" class="bg-white rounded-lg shadow p-8 text-center">
        <div class="text-4xl mb-4">
          ⏳
        </div>
        <p class="text-gray-600">
          Loading teams...
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
              Error Loading Teams
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
              No Teams Found
            </h3>
            <p class="text-sm text-yellow-700">
              The database appears to be empty. Try running: <code class="bg-yellow-100 px-2 py-1 rounded">npm run seed</code>
            </p>
          </div>
        </div>
      </div>

      <!-- Teams List -->
      <div v-else>
        <!-- Summary -->
        <div class="bg-white rounded-lg shadow p-6 mb-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold text-gray-900">
                Total Teams
              </h2>
              <p class="text-3xl font-bold text-blue-600">
                {{ data.count }}
              </p>
            </div>
            <div class="text-right">
              <div class="text-sm text-gray-600">
                Total Ownership
              </div>
              <div class="flex gap-4 mt-2">
                <div>
                  <span class="text-xs text-gray-500">Technologies:</span>
                  <span class="ml-1 font-semibold text-purple-600">{{ totalTechnologies }}</span>
                </div>
                <div>
                  <span class="text-xs text-gray-500">Systems:</span>
                  <span class="ml-1 font-semibold text-blue-600">{{ totalSystems }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Teams Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="team in data.data"
            :key="team.name"
            class="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
          >
            <!-- Header -->
            <div class="mb-4">
              <h3 class="text-xl font-bold text-gray-900 mb-1">
                {{ team.name }}
              </h3>
              <a
                :href="`mailto:${team.email}`"
                class="text-sm text-blue-600 hover:text-blue-800"
              >
                {{ team.email }}
              </a>
            </div>

            <!-- Details -->
            <div class="space-y-3 text-sm">
              <div>
                <span class="text-gray-500">Responsibility:</span>
                <span class="ml-2 font-medium text-gray-900">{{ team.responsibilityArea }}</span>
              </div>

              <div class="pt-3 border-t border-gray-200">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-gray-500">Ownership</span>
                </div>
                <div class="space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="text-gray-600">Technologies</span>
                    <span class="font-semibold text-purple-600">{{ team.technologyCount }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-gray-600">Systems</span>
                    <span class="font-semibold text-blue-600">{{ team.systemCount }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Team {
  name: string
  email: string
  responsibilityArea: string
  technologyCount: number
  systemCount: number
}

interface TeamsResponse {
  success: boolean
  data: Team[]
  count: number
  error?: string
}

const { data, pending, error } = await useFetch<TeamsResponse>('/api/teams')

const totalTechnologies = computed(() => {
  if (!data.value?.data) return 0
  return data.value.data.reduce((sum, team) => sum + team.technologyCount, 0)
})

const totalSystems = computed(() => {
  if (!data.value?.data) return 0
  return data.value.data.reduce((sum, team) => sum + team.systemCount, 0)
})

useHead({
  title: 'Teams - Polaris'
})
</script>
