<template>
  
    <div class="space-y">
      <!-- Loading State -->
      <UiCard v-if="pending">
        <div class="text-center" style="padding: 3rem;">
          <div class="spinner" style="margin: 0 auto;"/>
          <p class="text-muted" style="margin-top: 1rem;">Loading technology details...</p>
        </div>
      </UiCard>

      <!-- Error State -->
      <UiCard v-else-if="error">
        <div class="flex items-center" style="gap: 1rem; color: var(--color-error);">
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3>Error Loading Technology</h3>
            <p class="text-sm">{{ error.message }}</p>
          </div>
        </div>
        <div style="margin-top: 1rem;">
          <NuxtLink to="/technologies">← Back to Technologies</NuxtLink>
        </div>
      </UiCard>

      <!-- Technology Details -->
      <template v-else-if="data?.data">
        <!-- Header -->
        <div>
          <div style="margin-bottom: 1rem;">
            <NuxtLink to="/technologies">← Back to Technologies</NuxtLink>
          </div>
          <div class="flex justify-between items-center">
            <div>
              <h1 style="margin-bottom: 0.5rem;">{{ data.data.name }}</h1>
              <p class="text-lg text-muted">{{ data.data.vendor }}</p>
            </div>
            <UiBadge
              v-if="data.data.status"
              :variant="data.data.status === 'approved' ? 'success' : data.data.status === 'deprecated' ? 'warning' : 'neutral'"
            >
              {{ data.data.status }}
            </UiBadge>
          </div>
        </div>

        <!-- Main Info Grid -->
        <div class="grid grid-cols-2">
          <!-- Basic Information -->
          <UiCard>
            <template #header>
              <h2>Basic Information</h2>
            </template>
            <div class="space-y" style="--space: 0.75rem;">
              <div>
                <span class="text-sm text-muted">Category</span>
                <p class="font-medium">{{ data.data.category }}</p>
              </div>
              <div>
                <span class="text-sm text-muted">Risk Level</span>
                <p class="font-medium" :class="getRiskClass(data.data.riskLevel)">
                  {{ data.data.riskLevel }}
                </p>
              </div>
              <div v-if="data.data.approvedVersionRange">
                <span class="text-sm text-muted">Approved Version Range</span>
                <p><code>{{ data.data.approvedVersionRange }}</code></p>
              </div>
              <div v-if="data.data.lastReviewed">
                <span class="text-sm text-muted">Last Reviewed</span>
                <p class="font-medium">{{ formatDate(data.data.lastReviewed) }}</p>
              </div>
            </div>
          </UiCard>

          <!-- Ownership -->
          <UiCard>
            <template #header>
              <h2>Ownership</h2>
            </template>
            <div v-if="data.data.ownerTeamName" class="space-y" style="--space: 0.75rem;">
              <div>
                <span class="text-sm text-muted">Team</span>
                <p class="font-medium">{{ data.data.ownerTeamName }}</p>
              </div>
              <div v-if="data.data.ownerTeamEmail">
                <span class="text-sm text-muted">Contact</span>
                <p><a :href="`mailto:${data.data.ownerTeamEmail}`">{{ data.data.ownerTeamEmail }}</a></p>
              </div>
            </div>
            <p v-else class="text-muted">No owner team assigned</p>
          </UiCard>
        </div>

        <!-- Versions -->
        <UiCard v-if="data.data.versions && data.data.versions.length > 0">
          <template #header>
            <h2>Versions</h2>
          </template>
          <div class="grid grid-cols-3">
            <div
              v-for="version in data.data.versions"
              :key="version.version"
              style="border: 1px solid var(--color-border); border-radius: 0.5rem; padding: 1rem; background: #f9fafb;"
            >
              <div class="flex justify-between items-center" style="margin-bottom: 0.5rem;">
                <code class="font-semibold">{{ version.version }}</code>
                <UiBadge v-if="version.approved" variant="success">Approved</UiBadge>
              </div>
              <div class="text-sm space-y" style="--space: 0.25rem;">
                <div v-if="version.releaseDate">
                  <span class="text-muted">Released:</span> {{ formatDate(version.releaseDate) }}
                </div>
                <div v-if="version.eolDate">
                  <span class="text-muted">EOL:</span> {{ formatDate(version.eolDate) }}
                </div>
                <div v-if="version.cvssScore !== undefined">
                  <span class="text-muted">CVSS:</span> {{ version.cvssScore }}
                </div>
                <p v-if="version.notes" class="text-muted text-sm" style="margin-top: 0.5rem;">{{ version.notes }}</p>
              </div>
            </div>
          </div>
        </UiCard>

        <!-- Components -->
        <UiCard v-if="data.data.components && data.data.components.length > 0">
          <template #header>
            <h2>Components ({{ data.data.components.length }})</h2>
          </template>
          <div class="space-y" style="--space: 0.5rem;">
            <div
              v-for="component in data.data.components"
              :key="`${component.name}-${component.version}`"
              class="flex justify-between items-center"
              style="padding: 0.75rem; background: #f9fafb; border-radius: 0.375rem;"
            >
              <div>
                <span class="font-medium">{{ component.name }}</span>
                <span class="text-muted" style="margin-left: 0.5rem;">v{{ component.version }}</span>
              </div>
              <UiBadge variant="primary">{{ component.packageManager }}</UiBadge>
            </div>
          </div>
        </UiCard>

        <!-- Systems Using This Technology -->
        <UiCard v-if="data.data.systems && data.data.systems.length > 0">
          <template #header>
            <h2>Used by Systems ({{ data.data.systems.length }})</h2>
          </template>
          <div class="flex" style="flex-wrap: wrap; gap: 0.5rem;">
            <UiBadge v-for="system in data.data.systems" :key="system" variant="primary">
              {{ system }}
            </UiBadge>
          </div>
        </UiCard>

        <!-- Policies -->
        <UiCard v-if="data.data.policies && data.data.policies.length > 0">
          <template #header>
            <h2>Applicable Policies ({{ data.data.policies.length }})</h2>
          </template>
          <div class="space-y" style="--space: 0.75rem;">
            <div
              v-for="policy in data.data.policies"
              :key="policy.name"
              class="flex justify-between items-center"
              style="padding: 0.75rem; background: #f9fafb; border-radius: 0.375rem;"
            >
              <div>
                <span class="font-medium">{{ policy.name }}</span>
                <span class="text-muted text-sm" style="margin-left: 0.5rem;">({{ policy.ruleType }})</span>
              </div>
              <UiBadge
                :variant="policy.severity === 'critical' || policy.severity === 'error' ? 'error' : policy.severity === 'warning' ? 'warning' : 'primary'"
              >
                {{ policy.severity }}
              </UiBadge>
            </div>
          </div>
        </UiCard>
      </template>
    </div>
  
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

function getRiskClass(riskLevel: string): string {
  const classes: Record<string, string> = {
    low: 'text-success',
    medium: 'text-warning',
    high: 'text-error',
    critical: 'text-error'
  }
  return classes[riskLevel] || ''
}

useHead({
  title: computed(() => data.value?.data ? `${data.value.data.name} - Polaris` : 'Technology - Polaris')
})
</script>
