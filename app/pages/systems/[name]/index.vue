<template>
  <div class="space-y">
    <!-- Loading State -->
    <UiCard v-if="pending">
      <div class="text-center" style="padding: 3rem;">
        <div class="spinner" style="margin: 0 auto;"/>
        <p class="text-muted" style="margin-top: 1rem;">Loading system details...</p>
      </div>
    </UiCard>

    <!-- Error State -->
    <UiCard v-else-if="error">
      <div class="flex items-center" style="gap: 1rem; color: var(--color-error);">
        <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3>Error Loading System</h3>
          <p class="text-sm">{{ error.message }}</p>
        </div>
      </div>
      <div style="margin-top: 1rem;">
        <NuxtLink to="/systems">← Back to Systems</NuxtLink>
      </div>
    </UiCard>

    <!-- System Details -->
    <template v-else-if="data?.data">
      <!-- Header -->
      <div class="page-header">
        <NuxtLink to="/systems" style="display: inline-block; margin-bottom: 0.5rem;">← Back to Systems</NuxtLink>
        <div class="flex justify-between items-center">
          <div>
            <h1>{{ data.data.name }}</h1>
            <p>{{ data.data.domain }}</p>
          </div>
          <UiBadge :variant="getCriticalityVariant(data.data.businessCriticality)">
            {{ data.data.businessCriticality }}
          </UiBadge>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <UiStatCard label="Components" :value="data.data.componentCount || 0" variant="primary" />
        <UiStatCard label="Repositories" :value="data.data.repositoryCount || 0" variant="success" />
        <UiStatCard label="Environment" :value="data.data.environment || '—'" variant="neutral" />
        <UiStatCard label="Criticality" :value="data.data.businessCriticality || '—'" :variant="getCriticalityVariant(data.data.businessCriticality)" />
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
              <span class="text-sm text-muted">Domain</span>
              <p class="font-medium">{{ data.data.domain || '—' }}</p>
            </div>
            <div>
              <span class="text-sm text-muted">Environment</span>
              <p class="font-medium">{{ data.data.environment || '—' }}</p>
            </div>
            <div>
              <span class="text-sm text-muted">Business Criticality</span>
              <p class="font-medium" :class="getCriticalityClass(data.data.businessCriticality)">
                {{ data.data.businessCriticality || '—' }}
              </p>
            </div>
          </div>
        </UiCard>

        <!-- Ownership -->
        <UiCard>
          <template #header>
            <h2>Ownership</h2>
          </template>
          <div class="space-y" style="--space: 0.75rem;">
            <div>
              <span class="text-sm text-muted">Owner Team</span>
              <p v-if="data.data.ownerTeam" class="font-medium">
                <NuxtLink :to="`/teams/${encodeURIComponent(data.data.ownerTeam)}`">
                  {{ data.data.ownerTeam }}
                </NuxtLink>
              </p>
              <p v-else class="text-muted">No owner assigned</p>
            </div>
          </div>
        </UiCard>
      </div>

      <!-- Quick Actions -->
      <UiCard>
        <template #header>
          <h2>Quick Actions</h2>
        </template>
        <div class="flex gap-4 flex-wrap">
          <NuxtLink :to="`/systems/${encodeURIComponent(data.data.name)}/unmapped-components`" class="btn btn-secondary">
            View Unmapped Components
          </NuxtLink>
          <NuxtLink to="/components" class="btn btn-secondary">
            View All Components
          </NuxtLink>
        </div>
      </UiCard>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

interface System {
  name: string
  domain: string
  ownerTeam: string | null
  businessCriticality: string
  environment: string
  componentCount: number
  repositoryCount: number
}

interface SystemResponse {
  success: boolean
  data: System
}

const { data, pending, error } = await useFetch<SystemResponse>(() => `/api/systems/${encodeURIComponent(route.params.name as string)}`)

function getCriticalityVariant(criticality: string): 'error' | 'warning' | 'success' | 'neutral' {
  const variants: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error',
    high: 'warning',
    medium: 'success',
    low: 'neutral'
  }
  return variants[criticality?.toLowerCase()] || 'neutral'
}

function getCriticalityClass(criticality: string): string {
  const classes: Record<string, string> = {
    critical: 'text-error',
    high: 'text-warning',
    medium: 'text-success',
    low: ''
  }
  return classes[criticality?.toLowerCase()] || ''
}

useHead({
  title: computed(() => data.value?.data ? `${data.value.data.name} - Polaris` : 'System - Polaris')
})
</script>
