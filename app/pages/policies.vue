<template>
  <NuxtLayout name="default">
    <div class="space-y">
      <div>
        <h1>Policies</h1>
        <p class="text-muted" style="margin-top: 0.5rem;">Governance and compliance rules</p>
      </div>

      <UiCard v-if="pending">
        <div class="text-center" style="padding: 3rem;">
          <div class="spinner" style="margin: 0 auto;"/>
          <p class="text-muted" style="margin-top: 1rem;">Loading policies...</p>
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
        <UiCard>
          <div class="text-center">
            <p class="text-sm text-muted">Total Policies</p>
            <p class="text-3xl font-bold" style="margin-top: 0.5rem;">{{ count }}</p>
          </div>
        </UiCard>

        <div class="space-y">
          <UiCard v-for="policy in data.data" :key="policy.name">
            <template #header>
              <div class="flex justify-between items-center">
                <div>
                  <h3>{{ policy.name }}</h3>
                  <p v-if="policy.description" class="text-sm text-muted" style="margin-top: 0.25rem;">{{ policy.description }}</p>
                </div>
                <UiBadge v-if="policy.severity" :variant="getSeverityVariant(policy.severity)">
                  {{ policy.severity }}
                </UiBadge>
              </div>
            </template>
            <div class="grid grid-cols-4 text-sm">
              <div v-if="policy.ruleType">
                <span class="text-muted">Type:</span>
                <span style="margin-left: 0.5rem;">{{ policy.ruleType }}</span>
              </div>
              <div v-if="policy.scope">
                <span class="text-muted">Scope:</span>
                <span style="margin-left: 0.5rem;">{{ policy.scope }}</span>
              </div>
              <div v-if="policy.enforcedBy">
                <span class="text-muted">Enforced By:</span>
                <span style="margin-left: 0.5rem;">{{ policy.enforcedBy }}</span>
              </div>
              <div v-if="policy.status">
                <span class="text-muted">Status:</span>
                <UiBadge :variant="policy.status === 'active' ? 'success' : 'neutral'" style="margin-left: 0.5rem;">
                  {{ policy.status }}
                </UiBadge>
              </div>
            </div>
          </UiCard>
        </div>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { ApiResponse, Policy } from '~~/types/api'

const { data, pending, error } = await useFetch<ApiResponse<Policy>>('/api/policies')
const count = useApiCount(data)

function getSeverityVariant(severity: string) {
  const variants: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error',
    error: 'error',
    warning: 'warning',
    info: 'primary'
  }
  return variants[severity] || 'neutral'
}

useHead({ title: 'Policies - Polaris' })
</script>
