<template>
  <NuxtLayout name="default">
    <div class="space-y-6">
      <!-- Loading State -->
      <UiCard v-if="pending">
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
          <p class="mt-4 text-gray-600 dark:text-gray-300">Loading technology details...</p>
        </div>
      </UiCard>

      <!-- Error State -->
      <UiCard v-else-if="error">
        <div class="flex items-center gap-4 text-error-600 dark:text-error-400">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 class="text-lg font-semibold">Error Loading Technology</h3>
            <p class="text-sm">{{ error.message }}</p>
          </div>
        </div>
        <div class="mt-4">
          <NuxtLink to="/technologies" class="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
            ← Back to Technologies
          </NuxtLink>
        </div>
      </UiCard>

      <!-- Technology Details -->
      <template v-else-if="data?.data">
        <!-- Header -->
        <div>
          <div class="flex items-center gap-4 mb-4">
            <NuxtLink to="/technologies" class="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
              ← Back to Technologies
            </NuxtLink>
          </div>
          <div class="flex items-start justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {{ data.data.name }}
              </h1>
              <p class="text-lg text-gray-600 dark:text-gray-300">
                {{ data.data.vendor }}
              </p>
            </div>
            <UiBadge
              v-if="data.data.status"
              :variant="data.data.status === 'approved' ? 'success' : data.data.status === 'deprecated' ? 'warning' : 'neutral'"
              size="lg"
            >
              {{ data.data.status }}
            </UiBadge>
          </div>
        </div>

        <!-- Main Info Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Basic Information -->
          <UiCard>
            <template #header>
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                Basic Information
              </h2>
            </template>
            <div class="space-y-3">
              <div>
                <span class="text-sm text-gray-600 dark:text-gray-300">Category</span>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ data.data.category }}
                </p>
              </div>
              <div>
                <span class="text-sm text-gray-600 dark:text-gray-300">Risk Level</span>
                <p
                  :class="[
                    'font-medium',
                    data.data.riskLevel === 'low' ? 'text-success-600 dark:text-success-400' :
                    data.data.riskLevel === 'medium' ? 'text-warning-600 dark:text-warning-400' :
                    data.data.riskLevel === 'high' ? 'text-error-600 dark:text-error-400' :
                    data.data.riskLevel === 'critical' ? 'text-error-600 dark:text-error-400' :
                    'text-gray-600 dark:text-gray-300'
                  ]"
                >
                  {{ data.data.riskLevel }}
                </p>
              </div>
              <div v-if="data.data.approvedVersionRange">
                <span class="text-sm text-gray-600 dark:text-gray-300">Approved Version Range</span>
                <p class="font-mono text-sm text-gray-900 dark:text-white">
                  {{ data.data.approvedVersionRange }}
                </p>
              </div>
              <div v-if="data.data.lastReviewed">
                <span class="text-sm text-gray-600 dark:text-gray-300">Last Reviewed</span>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ formatDate(data.data.lastReviewed) }}
                </p>
              </div>
            </div>
          </UiCard>

          <!-- Ownership -->
          <UiCard>
            <template #header>
              <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                Ownership
              </h2>
            </template>
            <div v-if="data.data.ownerTeamName" class="space-y-3">
              <div>
                <span class="text-sm text-gray-600 dark:text-gray-300">Team</span>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ data.data.ownerTeamName }}
                </p>
              </div>
              <div v-if="data.data.ownerTeamEmail">
                <span class="text-sm text-gray-600 dark:text-gray-300">Contact</span>
                <a
                  :href="`mailto:${data.data.ownerTeamEmail}`"
                  class="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                >
                  {{ data.data.ownerTeamEmail }}
                </a>
              </div>
            </div>
            <p v-else class="text-gray-600 dark:text-gray-300">
              No owner team assigned
            </p>
          </UiCard>
        </div>

        <!-- Versions -->
        <UiCard v-if="data.data.versions && data.data.versions.length > 0">
          <template #header>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">
              Versions
            </h2>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="version in data.data.versions"
              :key="version.version"
              class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50"
            >
              <div class="flex items-start justify-between mb-2">
                <span class="font-mono font-semibold text-gray-900 dark:text-white">{{ version.version }}</span>
                <UiBadge
                  v-if="version.approved"
                  variant="success"
                  size="sm"
                >
                  Approved
                </UiBadge>
              </div>
              <div class="space-y-1 text-sm">
                <div v-if="version.releaseDate">
                  <span class="text-gray-600 dark:text-gray-300">Released:</span>
                  <span class="ml-2 text-gray-900 dark:text-white">{{ formatDate(version.releaseDate) }}</span>
                </div>
                <div v-if="version.eolDate">
                  <span class="text-gray-600 dark:text-gray-300">EOL:</span>
                  <span class="ml-2 text-gray-900 dark:text-white">{{ formatDate(version.eolDate) }}</span>
                </div>
                <div v-if="version.cvssScore !== undefined">
                  <span class="text-gray-600 dark:text-gray-300">CVSS:</span>
                  <span class="ml-2 text-gray-900 dark:text-white">{{ version.cvssScore }}</span>
                </div>
                <p v-if="version.notes" class="text-gray-600 dark:text-gray-300 text-xs mt-2">
                  {{ version.notes }}
                </p>
              </div>
            </div>
          </div>
        </UiCard>

        <!-- Components -->
        <UiCard v-if="data.data.components && data.data.components.length > 0">
          <template #header>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">
              Components ({{ data.data.components.length }})
            </h2>
          </template>
          <div class="space-y-2">
            <div
              v-for="component in data.data.components"
              :key="`${component.name}-${component.version}`"
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded"
            >
              <div>
                <span class="font-medium text-gray-900 dark:text-white">{{ component.name }}</span>
                <span class="text-gray-600 dark:text-gray-300 ml-2">v{{ component.version }}</span>
              </div>
              <UiBadge variant="primary" size="sm">
                {{ component.packageManager }}
              </UiBadge>
            </div>
          </div>
        </UiCard>

        <!-- Systems Using This Technology -->
        <UiCard v-if="data.data.systems && data.data.systems.length > 0">
          <template #header>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">
              Used by Systems ({{ data.data.systems.length }})
            </h2>
          </template>
          <div class="flex flex-wrap gap-2">
            <UiBadge
              v-for="system in data.data.systems"
              :key="system"
              variant="primary"
            >
              {{ system }}
            </UiBadge>
          </div>
        </UiCard>

        <!-- Policies -->
        <UiCard v-if="data.data.policies && data.data.policies.length > 0">
          <template #header>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">
              Applicable Policies ({{ data.data.policies.length }})
            </h2>
          </template>
          <div class="space-y-3">
            <div
              v-for="policy in data.data.policies"
              :key="policy.name"
              class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded"
            >
              <div>
                <span class="font-medium text-gray-900 dark:text-white">{{ policy.name }}</span>
                <span class="text-gray-600 dark:text-gray-300 text-sm ml-2">({{ policy.ruleType }})</span>
              </div>
              <UiBadge
                :variant="
                  policy.severity === 'critical' || policy.severity === 'error' ? 'error' :
                  policy.severity === 'warning' ? 'warning' :
                  'primary'
                "
                size="sm"
              >
                {{ policy.severity }}
              </UiBadge>
            </div>
          </div>
        </UiCard>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
const route = useRoute()

interface TechnologyDetail {
  name: string
  category: string
  vendor: string
  status?: string
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

const { data, pending, error } = await useFetch<TechnologyDetailResponse>(() => `/api/technologies/${route.params.name}`)

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
