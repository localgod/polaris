<template>
  <div class="space-y">
    <!-- Loading State -->
    <UiCard v-if="pending">
      <div class="text-center" style="padding: 3rem;">
        <div class="spinner" style="margin: 0 auto;"/>
        <p class="text-muted" style="margin-top: 1rem;">Loading policy details...</p>
      </div>
    </UiCard>

    <!-- Error State -->
    <UiCard v-else-if="error">
      <div class="flex items-center" style="gap: 1rem; color: var(--color-error);">
        <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3>Error Loading Policy</h3>
          <p class="text-sm">{{ error.message }}</p>
        </div>
      </div>
      <div style="margin-top: 1rem;">
        <NuxtLink to="/policies">← Back to Policies</NuxtLink>
      </div>
    </UiCard>

    <!-- Policy Details -->
    <template v-else-if="data?.data">
      <!-- Header -->
      <div class="page-header">
        <NuxtLink to="/policies" style="display: inline-block; margin-bottom: 0.5rem;">← Back to Policies</NuxtLink>
        <div class="flex justify-between items-center">
          <div>
            <h1>{{ data.data.name }}</h1>
            <p>{{ data.data.description }}</p>
          </div>
          <div class="flex gap-2">
            <UiBadge :variant="getStatusVariant(data.data.status)">
              {{ data.data.status }}
            </UiBadge>
            <UiBadge :variant="getSeverityVariant(data.data.severity)">
              {{ data.data.severity }}
            </UiBadge>
          </div>
        </div>
      </div>

      <!-- Main Info Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Basic Information -->
        <UiCard>
          <template #header>
            <h2>Basic Information</h2>
          </template>
          <div class="space-y" style="--space: 0.75rem;">
            <div>
              <span class="text-sm text-muted">Rule Type</span>
              <p class="font-medium">{{ data.data.ruleType }}</p>
            </div>
            <div>
              <span class="text-sm text-muted">Scope</span>
              <p class="font-medium">{{ data.data.scope }}</p>
            </div>
            <div>
              <span class="text-sm text-muted">Severity</span>
              <p class="font-medium" :class="getSeverityClass(data.data.severity)">
                {{ data.data.severity }}
              </p>
            </div>
            <div>
              <span class="text-sm text-muted">Effective Date</span>
              <p class="font-medium">{{ formatDate(data.data.effectiveDate) }}</p>
            </div>
          </div>
        </UiCard>

        <!-- Enforcement -->
        <UiCard>
          <template #header>
            <h2>Enforcement</h2>
          </template>
          <div class="space-y" style="--space: 0.75rem;">
            <div>
              <span class="text-sm text-muted">Enforced By</span>
              <p v-if="data.data.enforcerTeam" class="font-medium">
                <NuxtLink :to="`/teams/${encodeURIComponent(data.data.enforcerTeam)}`">
                  {{ data.data.enforcerTeam }}
                </NuxtLink>
              </p>
              <p v-else class="text-muted">—</p>
            </div>
            <div>
              <span class="text-sm text-muted">Status</span>
              <p class="font-medium">{{ data.data.status }}</p>
            </div>
          </div>
        </UiCard>
      </div>

      <!-- Subject Teams -->
      <UiCard v-if="data.data.subjectTeams && data.data.subjectTeams.length > 0">
        <template #header>
          <h2>Subject Teams ({{ data.data.subjectTeams.length }})</h2>
        </template>
        <div class="flex flex-wrap gap-2">
          <NuxtLink
            v-for="team in data.data.subjectTeams"
            :key="team"
            :to="`/teams/${encodeURIComponent(team)}`"
            class="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
          >
            {{ team }}
          </NuxtLink>
        </div>
      </UiCard>

      <!-- License Rules (for license-compliance policies) -->
      <template v-if="data.data.ruleType === 'license-compliance'">
        <UiCard v-if="data.data.deniedLicenses && data.data.deniedLicenses.length > 0">
          <template #header>
            <h2>Denied Licenses ({{ data.data.deniedLicenses.length }})</h2>
          </template>
          <div class="flex flex-wrap gap-2">
            <UiBadge
              v-for="license in data.data.deniedLicenses"
              :key="license"
              variant="error"
            >
              {{ license }}
            </UiBadge>
          </div>
        </UiCard>

        <UiCard v-if="data.data.allowedLicenses && data.data.allowedLicenses.length > 0">
          <template #header>
            <h2>Allowed Licenses ({{ data.data.allowedLicenses.length }})</h2>
          </template>
          <div class="flex flex-wrap gap-2">
            <UiBadge
              v-for="license in data.data.allowedLicenses"
              :key="license"
              variant="success"
            >
              {{ license }}
            </UiBadge>
          </div>
        </UiCard>
      </template>

      <!-- Governed Technologies -->
      <UiCard v-if="data.data.governedTechnologies && data.data.governedTechnologies.length > 0">
        <template #header>
          <h2>Governed Technologies ({{ data.data.governedTechnologies.length }})</h2>
        </template>
        <div class="flex flex-wrap gap-2">
          <NuxtLink
            v-for="tech in data.data.governedTechnologies"
            :key="tech"
            :to="`/technologies/${encodeURIComponent(tech)}`"
            class="inline-block px-3 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200"
          >
            {{ tech }}
          </NuxtLink>
        </div>
      </UiCard>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

interface Policy {
  name: string
  description: string
  ruleType: string
  severity: string
  effectiveDate: string
  enforcedBy: string
  scope: string
  status: string
  licenseMode?: string
  enforcerTeam: string | null
  subjectTeams: string[]
  governedTechnologies: string[]
  governedVersions: string[]
  allowedLicenses?: string[]
  deniedLicenses?: string[]
}

interface PolicyResponse {
  success: boolean
  data: Policy
}

const { data, pending, error } = await useFetch<PolicyResponse>(() => `/api/policies/${encodeURIComponent(route.params.name as string)}`)

function getStatusVariant(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    active: 'success',
    draft: 'warning',
    inactive: 'neutral',
    archived: 'neutral'
  }
  return variants[status?.toLowerCase()] || 'neutral'
}

function getSeverityVariant(severity: string): 'success' | 'warning' | 'error' | 'neutral' {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    critical: 'error',
    error: 'error',
    warning: 'warning',
    info: 'neutral'
  }
  return variants[severity?.toLowerCase()] || 'neutral'
}

function getSeverityClass(severity: string): string {
  const classes: Record<string, string> = {
    critical: 'text-error',
    error: 'text-error',
    warning: 'text-warning',
    info: ''
  }
  return classes[severity?.toLowerCase()] || ''
}

function formatDate(dateString: string): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString()
}

useHead({
  title: computed(() => data.value?.data ? `${data.value.data.name} - Polaris` : 'Policy - Polaris')
})
</script>
