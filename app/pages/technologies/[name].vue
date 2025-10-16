<template>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <!-- Loading State -->
      <div v-if="pending" class="bg-white rounded-lg shadow p-8 text-center">
        <div class="text-4xl mb-4">
          ⏳
        </div>
        <p class="text-gray-600">
          Loading technology details...
        </p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border-l-4 border-red-500 rounded-lg shadow p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="text-3xl">
            ❌
          </div>
          <div>
            <h3 class="text-lg font-semibold text-red-900">
              Error Loading Technology
            </h3>
            <p class="text-sm text-red-700">
              {{ error.message }}
            </p>
          </div>
        </div>
        <NuxtLink to="/technologies" class="text-blue-600 hover:text-blue-800">
          ← Back to Technologies
        </NuxtLink>
      </div>

      <!-- Technology Details -->
      <div v-else-if="data?.data">
        <!-- Header -->
        <div class="mb-8">
          <div class="flex items-center gap-4 mb-4">
            <NuxtLink to="/technologies" class="text-blue-600 hover:text-blue-800">
              ← Back to Technologies
            </NuxtLink>
          </div>
          <div class="flex items-start justify-between">
            <div>
              <h1 class="text-4xl font-bold text-gray-900 mb-2">
                {{ data.data.name }}
              </h1>
              <p class="text-xl text-gray-600">
                {{ data.data.vendor }}
              </p>
            </div>
            <span
              :class="[
                'px-4 py-2 rounded-full text-sm font-semibold',
                data.data.status === 'approved' ? 'bg-green-100 text-green-800' :
                data.data.status === 'deprecated' ? 'bg-orange-100 text-orange-800' :
                data.data.status === 'experimental' ? 'bg-purple-100 text-purple-800' :
                'bg-gray-100 text-gray-800'
              ]"
            >
              {{ data.data.status }}
            </span>
          </div>
        </div>

        <!-- Main Info Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <!-- Basic Information -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-bold text-gray-900 mb-4">
              Basic Information
            </h2>
            <div class="space-y-3">
              <div>
                <span class="text-sm text-gray-500">Category</span>
                <p class="font-medium text-gray-900">
                  {{ data.data.category }}
                </p>
              </div>
              <div>
                <span class="text-sm text-gray-500">Risk Level</span>
                <p
                  :class="[
                    'font-medium',
                    data.data.riskLevel === 'low' ? 'text-green-600' :
                    data.data.riskLevel === 'medium' ? 'text-yellow-600' :
                    data.data.riskLevel === 'high' ? 'text-orange-600' :
                    data.data.riskLevel === 'critical' ? 'text-red-600' :
                    'text-gray-600'
                  ]"
                >
                  {{ data.data.riskLevel }}
                </p>
              </div>
              <div v-if="data.data.approvedVersionRange">
                <span class="text-sm text-gray-500">Approved Version Range</span>
                <p class="font-mono text-sm text-gray-900">
                  {{ data.data.approvedVersionRange }}
                </p>
              </div>
              <div v-if="data.data.lastReviewed">
                <span class="text-sm text-gray-500">Last Reviewed</span>
                <p class="font-medium text-gray-900">
                  {{ formatDate(data.data.lastReviewed) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Ownership -->
          <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-bold text-gray-900 mb-4">
              Ownership
            </h2>
            <div v-if="data.data.ownerTeamName" class="space-y-3">
              <div>
                <span class="text-sm text-gray-500">Team</span>
                <p class="font-medium text-gray-900">
                  {{ data.data.ownerTeamName }}
                </p>
              </div>
              <div v-if="data.data.ownerTeamEmail">
                <span class="text-sm text-gray-500">Contact</span>
                <a
                  :href="`mailto:${data.data.ownerTeamEmail}`"
                  class="font-medium text-blue-600 hover:text-blue-800"
                >
                  {{ data.data.ownerTeamEmail }}
                </a>
              </div>
            </div>
            <p v-else class="text-gray-500">
              No owner team assigned
            </p>
          </div>
        </div>

        <!-- Versions -->
        <div v-if="data.data.versions && data.data.versions.length > 0" class="bg-white rounded-lg shadow p-6 mb-8">
          <h2 class="text-xl font-bold text-gray-900 mb-4">
            Versions
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="version in data.data.versions"
              :key="version.version"
              class="border border-gray-200 rounded-lg p-4"
            >
              <div class="flex items-start justify-between mb-2">
                <span class="font-mono font-semibold text-gray-900">{{ version.version }}</span>
                <span
                  v-if="version.approved"
                  class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium"
                >
                  Approved
                </span>
              </div>
              <div class="space-y-1 text-sm">
                <div v-if="version.releaseDate">
                  <span class="text-gray-500">Released:</span>
                  <span class="ml-2 text-gray-900">{{ formatDate(version.releaseDate) }}</span>
                </div>
                <div v-if="version.eolDate">
                  <span class="text-gray-500">EOL:</span>
                  <span class="ml-2 text-gray-900">{{ formatDate(version.eolDate) }}</span>
                </div>
                <div v-if="version.cvssScore !== undefined">
                  <span class="text-gray-500">CVSS:</span>
                  <span class="ml-2 text-gray-900">{{ version.cvssScore }}</span>
                </div>
                <p v-if="version.notes" class="text-gray-600 text-xs mt-2">
                  {{ version.notes }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Components -->
        <div v-if="data.data.components && data.data.components.length > 0" class="bg-white rounded-lg shadow p-6 mb-8">
          <h2 class="text-xl font-bold text-gray-900 mb-4">
            Components ({{ data.data.components.length }})
          </h2>
          <div class="space-y-2">
            <div
              v-for="component in data.data.components"
              :key="`${component.name}-${component.version}`"
              class="flex items-center justify-between p-3 bg-gray-50 rounded"
            >
              <div>
                <span class="font-medium text-gray-900">{{ component.name }}</span>
                <span class="text-gray-500 ml-2">v{{ component.version }}</span>
              </div>
              <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                {{ component.packageManager }}
              </span>
            </div>
          </div>
        </div>

        <!-- Systems Using This Technology -->
        <div v-if="data.data.systems && data.data.systems.length > 0" class="bg-white rounded-lg shadow p-6 mb-8">
          <h2 class="text-xl font-bold text-gray-900 mb-4">
            Used by Systems ({{ data.data.systems.length }})
          </h2>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="system in data.data.systems"
              :key="system"
              class="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium"
            >
              {{ system }}
            </span>
          </div>
        </div>

        <!-- Policies -->
        <div v-if="data.data.policies && data.data.policies.length > 0" class="bg-white rounded-lg shadow p-6">
          <h2 class="text-xl font-bold text-gray-900 mb-4">
            Applicable Policies ({{ data.data.policies.length }})
          </h2>
          <div class="space-y-3">
            <div
              v-for="policy in data.data.policies"
              :key="policy.name"
              class="flex items-center justify-between p-3 bg-gray-50 rounded"
            >
              <div>
                <span class="font-medium text-gray-900">{{ policy.name }}</span>
                <span class="text-gray-500 text-sm ml-2">({{ policy.ruleType }})</span>
              </div>
              <span
                :class="[
                  'px-2 py-1 rounded text-xs font-medium',
                  policy.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  policy.severity === 'error' ? 'bg-orange-100 text-orange-800' :
                  policy.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                ]"
              >
                {{ policy.severity }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const name = route.params.name as string

interface TechnologyDetail {
  name: string
  category: string
  vendor: string
  status: string
  approvedVersionRange: string
  ownerTeam: string
  riskLevel: string
  lastReviewed: string
  ownerTeamName: string | null
  ownerTeamEmail: string | null
  versions: Array<{
    version: string
    releaseDate: string
    eolDate: string
    approved: boolean
    cvssScore: number
    notes: string
  }>
  components: Array<{
    name: string
    version: string
    packageManager: string
  }>
  systems: string[]
  policies: Array<{
    name: string
    severity: string
    ruleType: string
  }>
}

interface TechnologyDetailResponse {
  success: boolean
  data: TechnologyDetail
  error?: string
}

const { data, pending, error } = await useFetch<TechnologyDetailResponse>(`/api/technologies/${name}`)

function formatDate(dateString: string): string {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateString
  }
}

useHead({
  title: computed(() => data.value?.data ? `${data.value.data.name} - Polaris` : 'Technology - Polaris')
})
</script>
