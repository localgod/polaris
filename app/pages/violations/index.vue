<template>
  <NuxtLayout name="default">
    <div class="space-y">
      <div class="flex justify-between items-center">
        <div>
          <h1>Policy Violations</h1>
          <p class="text-muted" style="margin-top: 0.5rem;">Technologies and licenses used without approval</p>
        </div>
        <NuxtLink to="/violations/licenses" class="btn btn-primary">View License Violations</NuxtLink>
      </div>

      <UiCard v-if="pending">
        <div class="text-center" style="padding: 3rem;">
          <div class="spinner" style="margin: 0 auto;" />
          <p class="text-muted" style="margin-top: 1rem;">Loading violations...</p>
        </div>
      </UiCard>

      <UiCard v-else-if="error">
        <div class="flex items-center" style="gap: 1rem; color: var(--color-error);">
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3>Error</h3>
            <p class="text-sm">{{ error.message }}</p>
          </div>
        </div>
      </UiCard>

      <template v-else-if="data">
        <div class="grid grid-cols-4">
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">Total Violations</p>
              <p class="text-3xl font-bold text-error" style="margin-top: 0.25rem;">{{ data.count }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">Critical</p>
              <p class="text-3xl font-bold text-error" style="margin-top: 0.25rem;">{{ data.summary?.critical || 0 }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">Error</p>
              <p class="text-3xl font-bold text-warning" style="margin-top: 0.25rem;">{{ data.summary?.error || 0 }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">Warning</p>
              <p class="text-3xl font-bold" style="margin-top: 0.25rem;">{{ data.summary?.warning || 0 }}</p>
            </div>
          </UiCard>
        </div>

        <UiCard v-if="data.count === 0">
          <div class="text-center" style="padding: 2rem;">
            <svg style="margin: 0 auto; width: 3rem; height: 3rem; color: var(--color-success);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 style="margin-top: 1rem;">No Violations!</h3>
            <p class="text-muted" style="margin-top: 0.5rem;">All technologies are properly approved.</p>
          </div>
        </UiCard>

        <div v-else class="space-y">
          <UiCard v-for="violation in data.data" :key="violation.violationId">
            <template #header>
              <div class="flex justify-between items-center">
                <div>
                  <h3>{{ violation.policyName }}</h3>
                  <p class="text-sm text-muted">{{ violation.systemName }}</p>
                </div>
                <UiBadge :variant="getSeverityVariant(violation.severity)">{{ violation.severity }}</UiBadge>
              </div>
            </template>
            <div class="grid grid-cols-2 text-sm" style="gap: 1rem;">
              <div>
                <span class="text-muted">Component:</span>
                <span style="margin-left: 0.5rem;">{{ violation.componentName }}</span>
              </div>
              <div>
                <span class="text-muted">Version:</span>
                <code style="margin-left: 0.5rem;">{{ violation.componentVersion }}</code>
              </div>
              <div>
                <span class="text-muted">Status:</span>
                <UiBadge :variant="violation.status === 'open' ? 'error' : 'success'" style="margin-left: 0.5rem;">
                  {{ violation.status }}
                </UiBadge>
              </div>
              <div>
                <span class="text-muted">Detected:</span>
                <span style="margin-left: 0.5rem;">{{ formatDate(violation.detectedAt) }}</span>
              </div>
            </div>
            <p v-if="violation.notes" class="text-sm text-muted" style="margin-top: 0.75rem;">{{ violation.notes }}</p>
          </UiCard>
        </div>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
interface Violation {
  violationId: string
  policyName: string
  systemName: string
  componentName: string
  componentVersion: string
  severity: string
  detectedAt: string
  status: string
  resolvedAt: string | null
  notes: string | null
}

interface ViolationsResponse {
  success: boolean
  data: Violation[]
  count: number
  summary: {
    critical: number
    error: number
    warning: number
    info: number
  }
}

const { data, pending, error } = await useFetch<ViolationsResponse>('/api/policies/violations')

function getSeverityVariant(severity: string) {
  const variants: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error',
    error: 'error',
    warning: 'warning',
    info: 'neutral'
  }
  return variants[severity] || 'neutral'
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString()
}

useHead({ title: 'Violations - Polaris' })
</script>
