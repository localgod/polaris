<template>
  <NuxtLayout name="default">
    <div class="space-y">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1>Systems</h1>
          <p class="text-muted" style="margin-top: 0.5rem;">Deployable applications and services</p>
        </div>
        <NuxtLink to="/systems/new" class="btn btn-primary">
          + Create System
        </NuxtLink>
      </div>

      <!-- Loading State -->
      <UiCard v-if="pending">
        <div class="text-center" style="padding: 3rem;">
          <div class="spinner" style="margin: 0 auto;"/>
          <p class="text-muted" style="margin-top: 1rem;">Loading systems...</p>
        </div>
      </UiCard>

      <!-- Error State -->
      <UiCard v-else-if="error">
        <div class="flex items-center" style="gap: 1rem; color: var(--color-error);">
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3>Error Loading Systems</h3>
            <p class="text-sm">{{ error.message }}</p>
          </div>
        </div>
      </UiCard>

      <!-- No Data State -->
      <UiCard v-else-if="!data?.data || data.data.length === 0">
        <div class="text-center" style="padding: 3rem;">
          <svg style="margin: 0 auto; width: 3rem; height: 3rem; color: var(--color-text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 style="margin-top: 1rem;">No Systems Found</h3>
          <p class="text-muted" style="margin-top: 0.5rem;">
            The database appears to be empty. Try running: <code>npm run seed</code>
          </p>
        </div>
      </UiCard>

      <!-- Systems List -->
      <template v-else>
        <!-- Summary Stats -->
        <div class="grid grid-cols-4">
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">Total Systems</p>
              <p class="text-3xl font-bold" style="margin-top: 0.5rem;">{{ data.count }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">Critical</p>
              <p class="text-3xl font-bold text-error" style="margin-top: 0.5rem;">{{ criticalityCounts.critical }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">High</p>
              <p class="text-3xl font-bold text-warning" style="margin-top: 0.5rem;">{{ criticalityCounts.high }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">Medium/Low</p>
              <p class="text-3xl font-bold text-success" style="margin-top: 0.5rem;">{{ criticalityCounts.medium + criticalityCounts.low }}</p>
            </div>
          </UiCard>
        </div>

        <!-- Systems Grid -->
        <div class="grid grid-cols-3">
          <UiCard v-for="system in data.data" :key="system.name">
            <template #header>
              <div class="flex justify-between items-center">
                <div style="min-width: 0; flex: 1;">
                  <h3 style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ system.name }}</h3>
                  <p class="text-sm text-muted">{{ system.domain }}</p>
                </div>
                <UiBadge :variant="getCriticalityVariant(system.businessCriticality)">
                  {{ system.businessCriticality }}
                </UiBadge>
              </div>
            </template>

            <div class="space-y" style="--space: 0.75rem;">
              <div class="flex justify-between text-sm">
                <span class="text-muted">Environment</span>
                <span class="font-medium">{{ system.environment }}</span>
              </div>
              <div v-if="system.ownerTeam" class="flex justify-between text-sm">
                <span class="text-muted">Owner</span>
                <span class="font-medium">{{ system.ownerTeam }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted">Components</span>
                <span class="font-medium">{{ system.componentCount }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-muted">Repositories</span>
                <span class="font-medium">{{ system.repositoryCount }}</span>
              </div>
            </div>

            <template #footer>
              <NuxtLink :to="`/systems/${encodeURIComponent(system.name)}/unmapped-components`">
                View unmapped components →
              </NuxtLink>
            </template>
          </UiCard>
        </div>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
interface System {
  name: string
  domain: string
  ownerTeam: string | null
  businessCriticality: string
  environment: string
  componentCount: number
  repositoryCount: number
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

function getCriticalityVariant(criticality: string) {
  const variants: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error',
    high: 'warning',
    medium: 'success',
    low: 'neutral'
  }
  return variants[criticality] || 'neutral'
}

useHead({
  title: 'Systems - Polaris'
})
</script>
