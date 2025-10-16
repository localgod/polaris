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
        <h1 class="text-4xl font-bold text-gray-900 mb-2">Technologies</h1>
        <p class="text-gray-600">
          Enterprise technology catalog
        </p>
      </div>

      <!-- Loading State -->
      <div v-if="pending" class="bg-white rounded-lg shadow p-8 text-center">
        <div class="text-4xl mb-4">⏳</div>
        <p class="text-gray-600">Loading technologies...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border-l-4 border-red-500 rounded-lg shadow p-6">
        <div class="flex items-center gap-3">
          <div class="text-3xl">❌</div>
          <div>
            <h3 class="text-lg font-semibold text-red-900">Error Loading Technologies</h3>
            <p class="text-sm text-red-700">{{ error.message }}</p>
          </div>
        </div>
      </div>

      <!-- No Data State -->
      <div v-else-if="!data?.data || data.data.length === 0" class="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg shadow p-6">
        <div class="flex items-center gap-3">
          <div class="text-3xl">⚠️</div>
          <div>
            <h3 class="text-lg font-semibold text-yellow-900">No Technologies Found</h3>
            <p class="text-sm text-yellow-700">
              The database appears to be empty. Try running: <code class="bg-yellow-100 px-2 py-1 rounded">npm run seed</code>
            </p>
          </div>
        </div>
      </div>

      <!-- Technologies List -->
      <div v-else>
        <!-- Summary -->
        <div class="bg-white rounded-lg shadow p-6 mb-6">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold text-gray-900">Total Technologies</h2>
              <p class="text-3xl font-bold text-blue-600">{{ data.count }}</p>
            </div>
            <div class="text-right">
              <div class="text-sm text-gray-600">Status Breakdown</div>
              <div class="flex gap-4 mt-2">
                <div>
                  <span class="text-xs text-gray-500">Approved:</span>
                  <span class="ml-1 font-semibold text-green-600">{{ statusCounts.approved }}</span>
                </div>
                <div>
                  <span class="text-xs text-gray-500">Deprecated:</span>
                  <span class="ml-1 font-semibold text-orange-600">{{ statusCounts.deprecated }}</span>
                </div>
                <div>
                  <span class="text-xs text-gray-500">Experimental:</span>
                  <span class="ml-1 font-semibold text-purple-600">{{ statusCounts.experimental }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter by Category -->
        <div class="bg-white rounded-lg shadow p-4 mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
          <div class="flex flex-wrap gap-2">
            <button
              :class="[
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                selectedCategory === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
              @click="selectedCategory = null"
            >
              All ({{ data.count }})
            </button>
            <button
              v-for="category in categories"
              :key="category"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
              @click="selectedCategory = category"
            >
              {{ category }} ({{ categoryCounts[category] }})
            </button>
          </div>
        </div>

        <!-- Technologies Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NuxtLink
            v-for="tech in filteredTechnologies"
            :key="tech.name"
            :to="`/technologies/${tech.name}`"
            class="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 block"
          >
            <!-- Header -->
            <div class="flex items-start justify-between mb-4">
              <div>
                <h3 class="text-xl font-bold text-gray-900">{{ tech.name }}</h3>
                <p class="text-sm text-gray-500">{{ tech.vendor }}</p>
              </div>
              <span
                :class="[
                  'px-3 py-1 rounded-full text-xs font-semibold',
                  tech.status === 'approved' ? 'bg-green-100 text-green-800' :
                  tech.status === 'deprecated' ? 'bg-orange-100 text-orange-800' :
                  tech.status === 'experimental' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                ]"
              >
                {{ tech.status }}
              </span>
            </div>

            <!-- Details -->
            <div class="space-y-2 text-sm">
              <div>
                <span class="text-gray-500">Category:</span>
                <span class="ml-2 font-medium text-gray-900">{{ tech.category }}</span>
              </div>
              
              <div>
                <span class="text-gray-500">Risk Level:</span>
                <span
                  :class="[
                    'ml-2 font-medium',
                    tech.riskLevel === 'low' ? 'text-green-600' :
                    tech.riskLevel === 'medium' ? 'text-yellow-600' :
                    tech.riskLevel === 'high' ? 'text-orange-600' :
                    tech.riskLevel === 'critical' ? 'text-red-600' :
                    'text-gray-600'
                  ]"
                >
                  {{ tech.riskLevel }}
                </span>
              </div>

              <div v-if="tech.ownerTeam">
                <span class="text-gray-500">Owner:</span>
                <span class="ml-2 font-medium text-gray-900">{{ tech.ownerTeam }}</span>
              </div>

              <div v-if="tech.approvedVersionRange">
                <span class="text-gray-500">Approved Versions:</span>
                <code class="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">{{ tech.approvedVersionRange }}</code>
              </div>

              <div v-if="tech.versions && tech.versions.length > 0">
                <span class="text-gray-500">Available Versions:</span>
                <div class="ml-2 mt-1 flex flex-wrap gap-1">
                  <span
                    v-for="version in tech.versions"
                    :key="version"
                    class="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded"
                  >
                    {{ version }}
                  </span>
                </div>
              </div>

              <div v-if="tech.lastReviewed">
                <span class="text-gray-500">Last Reviewed:</span>
                <span class="ml-2 text-gray-700">{{ formatDate(tech.lastReviewed) }}</span>
              </div>
            </div>

            <!-- View Details Link -->
            <div class="mt-4 pt-4 border-t border-gray-200">
              <span class="text-blue-600 font-medium text-sm">
                View Details →
              </span>
            </div>
          </NuxtLink>
        </div>

        <!-- Empty Filter State -->
        <div v-if="filteredTechnologies.length === 0" class="bg-gray-50 rounded-lg p-8 text-center">
          <p class="text-gray-600">No technologies found in the "{{ selectedCategory }}" category.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Technology {
  name: string
  category: string
  vendor: string
  status: string
  approvedVersionRange: string
  ownerTeam: string
  riskLevel: string
  lastReviewed: string
  ownerTeamName: string | null
  versions: string[]
}

interface TechnologiesResponse {
  success: boolean
  data: Technology[]
  count: number
  error?: string
}

// Fetch technologies
const { data, pending, error } = await useFetch<TechnologiesResponse>('/api/technologies')

// Filter state
const selectedCategory = ref<string | null>(null)

// Computed properties
const categories = computed(() => {
  if (!data.value?.data) return []
  const cats = new Set(data.value.data.map(t => t.category))
  return Array.from(cats).sort()
})

const categoryCounts = computed(() => {
  if (!data.value?.data) return {}
  const counts: Record<string, number> = {}
  data.value.data.forEach(tech => {
    counts[tech.category] = (counts[tech.category] || 0) + 1
  })
  return counts
})

const statusCounts = computed(() => {
  if (!data.value?.data) return { approved: 0, deprecated: 0, experimental: 0 }
  const counts = { approved: 0, deprecated: 0, experimental: 0 }
  data.value.data.forEach(tech => {
    if (tech.status === 'approved') counts.approved++
    else if (tech.status === 'deprecated') counts.deprecated++
    else if (tech.status === 'experimental') counts.experimental++
  })
  return counts
})

const filteredTechnologies = computed(() => {
  if (!data.value?.data) return []
  if (!selectedCategory.value) return data.value.data
  return data.value.data.filter(t => t.category === selectedCategory.value)
})

// Helper functions
function formatDate(dateString: string): string {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateString
  }
}

// Page metadata
useHead({
  title: 'Technologies - Polaris'
})
</script>
