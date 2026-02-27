<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <UPageHeader
        title="Version Violations"
        description="Components outside allowed version ranges"
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
      <!-- Summary -->
      <div v-if="data.count > 0" class="grid grid-cols-4 gap-4">
        <UCard v-for="(count, level) in data.summary" :key="level">
          <div class="text-center">
            <p class="text-2xl font-bold">{{ count }}</p>
            <p class="text-sm text-(--ui-text-muted) capitalize">{{ level }}</p>
          </div>
        </UCard>
      </div>

      <UCard v-if="data.count === 0">
        <div class="text-center text-(--ui-text-muted) py-12">
          No violations found.
        </div>
      </UCard>

      <div v-else class="space-y-4">
        <UCard v-for="(violation, idx) in data.data" :key="idx">
          <template #header>
            <div class="flex justify-between items-center">
              <div>
                <h3 class="font-semibold">{{ violation.constraint.name }}</h3>
                <p class="text-sm text-(--ui-text-muted)">{{ violation.constraint.description }}</p>
              </div>
              <UBadge :color="getSeverityColor(violation.constraint.severity)" variant="subtle">
                {{ violation.constraint.severity }}
              </UBadge>
            </div>
          </template>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span class="text-(--ui-text-muted)">Team</span>
              <p class="font-medium">{{ violation.team }}</p>
            </div>
            <div>
              <span class="text-(--ui-text-muted)">System</span>
              <p class="font-medium">{{ violation.system }}</p>
            </div>
            <div>
              <span class="text-(--ui-text-muted)">Technology</span>
              <p class="font-medium">{{ violation.technology }}</p>
            </div>
            <div>
              <span class="text-(--ui-text-muted)">Component</span>
              <p class="font-medium">{{ violation.component }}</p>
            </div>
            <div>
              <span class="text-(--ui-text-muted)">Version</span>
              <p class="font-medium"><code>{{ violation.componentVersion }}</code></p>
            </div>
            <div v-if="violation.constraint.versionRange">
              <span class="text-(--ui-text-muted)">Required Range</span>
              <p class="font-medium"><code>{{ violation.constraint.versionRange }}</code></p>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
interface Violation {
  team: string
  system: string
  component: string
  componentVersion: string
  technology: string
  technologyType: string
  constraint: {
    name: string
    description: string
    severity: string
    versionRange: string | null
  }
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

const { data, pending, error } = await useFetch<ViolationsResponse>('/api/version-constraints/violations')

function getSeverityColor(severity: string): 'error' | 'warning' | 'success' | 'neutral' {
  const colors: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error', error: 'error', warning: 'warning', info: 'neutral'
  }
  return colors[severity] || 'neutral'
}

useHead({ title: 'Violations - Polaris' })
</script>
