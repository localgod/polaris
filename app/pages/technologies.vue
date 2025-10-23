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
          Governed software entities requiring architectural approval and lifecycle management
        </p>
        <div class="mt-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p class="text-sm text-blue-900">
            <strong>What is a Technology?</strong> Technologies are strategic software choices (frameworks, databases, platforms) 
            that require governance oversight, approval processes, and policy compliance. They differ from Components, 
            which are actual software artifacts discovered in systems.
          </p>
        </div>
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
              <div class="text-sm text-gray-600">TIME Breakdown</div>
              <div class="flex gap-4 mt-2">
                <div>
                  <span class="text-xs text-gray-500">Invest:</span>
                  <span class="ml-1 font-semibold text-green-600">{{ timeCounts.invest }}</span>
                </div>
                <div>
                  <span class="text-xs text-gray-500">Migrate:</span>
                  <span class="ml-1 font-semibold text-blue-600">{{ timeCounts.migrate }}</span>
                </div>
                <div>
                  <span class="text-xs text-gray-500">Tolerate:</span>
                  <span class="ml-1 font-semibold text-yellow-600">{{ timeCounts.tolerate }}</span>
                </div>
                <div>
                  <span class="text-xs text-gray-500">Eliminate:</span>
                  <span class="ml-1 font-semibold text-red-600">{{ timeCounts.eliminate }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter by Technology Type -->
        <div class="bg-white rounded-lg shadow p-4 mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Filter by Technology Type</label>
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
              {{ getCategoryLabel(category) }} ({{ categoryCounts[category] }})
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
            <div class="mb-4">
              <div class="flex items-start justify-between mb-2">
                <div class="flex-1">
                  <h3 class="text-xl font-bold text-gray-900">{{ tech.name }}</h3>
                  <p class="text-sm text-gray-500">{{ tech.vendor }}</p>
                </div>
                <span
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2',
                    getCategoryColor(tech.category)
                  ]"
                >
                  {{ getCategoryLabel(tech.category) }}
                </span>
              </div>
              
              <!-- Team Approvals -->
              <div v-if="tech.approvals && tech.approvals.length > 0" class="flex flex-wrap gap-1 mt-2">
                <span
                  v-for="approval in tech.approvals"
                  :key="approval.team"
                  :class="[
                    'px-2 py-1 rounded text-xs font-medium',
                    approval.time === 'invest' ? 'bg-green-100 text-green-800' :
                    approval.time === 'migrate' ? 'bg-blue-100 text-blue-800' :
                    approval.time === 'tolerate' ? 'bg-yellow-100 text-yellow-800' :
                    approval.time === 'eliminate' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  ]"
                  :title="approval.notes || ''"
                >
                  {{ approval.team }}: {{ getTimeLabel(approval.time) }}
                </span>
              </div>
              <div v-else class="mt-2">
                <span class="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                  No team approvals
                </span>
              </div>
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
interface Approval {
  team: string
  time: string
  approvedAt?: string
  deprecatedAt?: string
  eolDate?: string
  migrationTarget?: string
  notes?: string
  approvedBy?: string
  versionConstraint?: string
}

interface Technology {
  name: string
  category: string
  vendor: string
  approvedVersionRange: string
  ownerTeam: string
  riskLevel: string
  lastReviewed: string
  ownerTeamName: string | null
  versions: string[]
  approvals: Approval[]
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

const timeCounts = computed(() => {
  if (!data.value?.data) return { invest: 0, migrate: 0, tolerate: 0, eliminate: 0 }
  const counts = { invest: 0, migrate: 0, tolerate: 0, eliminate: 0 }
  data.value.data.forEach(tech => {
    tech.approvals.forEach(approval => {
      if (approval.time === 'invest') counts.invest++
      else if (approval.time === 'migrate') counts.migrate++
      else if (approval.time === 'tolerate') counts.tolerate++
      else if (approval.time === 'eliminate') counts.eliminate++
    })
  })
  return counts
})

const filteredTechnologies = computed(() => {
  if (!data.value?.data) return []
  if (!selectedCategory.value) return data.value.data
  return data.value.data.filter(t => t.category === selectedCategory.value)
})

// Helper functions
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'runtime': 'Runtime',
    'framework': 'Framework',
    'database': 'Database',
    'cache': 'Cache',
    'integration': 'Integration',
    'security': 'Security',
    'infrastructure': 'Infrastructure',
    'container': 'Container',
    'language': 'Language',
    'library': 'Library',
    'deprecated': 'Deprecated'
  }
  return labels[category] || category
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'runtime': 'bg-purple-100 text-purple-800',
    'framework': 'bg-blue-100 text-blue-800',
    'database': 'bg-green-100 text-green-800',
    'cache': 'bg-cyan-100 text-cyan-800',
    'integration': 'bg-indigo-100 text-indigo-800',
    'security': 'bg-red-100 text-red-800',
    'infrastructure': 'bg-gray-100 text-gray-800',
    'container': 'bg-slate-100 text-slate-800',
    'language': 'bg-amber-100 text-amber-800',
    'library': 'bg-orange-100 text-orange-800',
    'deprecated': 'bg-red-100 text-red-800'
  }
  return colors[category] || 'bg-gray-100 text-gray-800'
}

function formatDate(dateString: string): string {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateString
  }
}

function _getApprovalSummary(tech: Technology): string {
  if (!tech.approvals || tech.approvals.length === 0) return 'No approvals'
  const invest = tech.approvals.filter(a => a.time === 'invest').length
  const migrate = tech.approvals.filter(a => a.time === 'migrate').length
  const tolerate = tech.approvals.filter(a => a.time === 'tolerate').length
  const eliminate = tech.approvals.filter(a => a.time === 'eliminate').length
  
  const parts = []
  if (invest > 0) parts.push(`${invest} invest`)
  if (migrate > 0) parts.push(`${migrate} migrate`)
  if (tolerate > 0) parts.push(`${tolerate} tolerate`)
  if (eliminate > 0) parts.push(`${eliminate} eliminate`)
  
  return parts.join(', ') || `${tech.approvals.length} teams`
}

function getTimeLabel(time: string): string {
  const labels: Record<string, string> = {
    'invest': 'Invest',
    'migrate': 'Migrate',
    'tolerate': 'Tolerate',
    'eliminate': 'Eliminate'
  }
  return labels[time] || time
}

// Page metadata
useHead({
  title: 'Technologies - Polaris'
})
</script>
