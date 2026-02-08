<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <UPageHeader
        title="Policy Violations"
        description="Technologies and licenses used without approval"
      />
      <UButton
        label="View License Violations"
        to="/violations/licenses"
        color="primary"
      />
    </div>

    <USkeleton v-if="pending" class="h-64 w-full" />

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Error"
      :description="error.message"
    />

    <template v-else-if="data">
      <UCard v-if="data.count === 0">
        <div class="text-center text-(--ui-text-muted) py-12">
          No violations found.
        </div>
      </UCard>

      <div v-else class="space-y-6">
        <UCard v-for="violation in data.data" :key="violation.violationId">
          <template #header>
            <div class="flex justify-between items-center">
              <div>
                <h3>{{ violation.policyName }}</h3>
                <p class="text-sm text-(--ui-text-muted)">{{ violation.systemName }}</p>
              </div>
              <UBadge :color="getSeverityColor(violation.severity)" variant="subtle">
                {{ violation.severity }}
              </UBadge>
            </div>
          </template>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-(--ui-text-muted)">Component:</span>
              <span class="ml-2">{{ violation.componentName }}</span>
            </div>
            <div>
              <span class="text-(--ui-text-muted)">Version:</span>
              <code class="ml-2">{{ violation.componentVersion }}</code>
            </div>
            <div>
              <span class="text-(--ui-text-muted)">Status:</span>
              <UBadge
                :color="violation.status === 'open' ? 'error' : 'success'"
                variant="subtle"
                class="ml-2"
              >
                {{ violation.status }}
              </UBadge>
            </div>
            <div>
              <span class="text-(--ui-text-muted)">Detected:</span>
              <span class="ml-2">{{ formatDate(violation.detectedAt) }}</span>
            </div>
          </div>
          <p v-if="violation.notes" class="text-sm text-(--ui-text-muted) mt-3">{{ violation.notes }}</p>
        </UCard>
      </div>
    </template>
  </div>
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

function getSeverityColor(severity: string): 'error' | 'warning' | 'success' | 'neutral' {
  const colors: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error',
    error: 'error',
    warning: 'warning',
    info: 'neutral'
  }
  return colors[severity] || 'neutral'
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString()
}

useHead({ title: 'Violations - Polaris' })
</script>
