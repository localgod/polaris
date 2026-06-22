<template>
  <div class="space-y-6">
    <USkeleton v-if="pending" class="h-96 w-full" />

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Error Loading System"
      :description="error.message"
    >
      <template #actions>
        <UButton label="Back to Systems" to="/systems" variant="outline" />
      </template>
    </UAlert>

    <template v-else-if="data?.data">
      <div class="flex justify-between items-center">
        <UPageHeader
          :title="data.data.name"
          :description="data.data.domain"
          :links="[{ label: 'Back to Systems', to: '/systems', icon: 'i-lucide-arrow-left', variant: 'outline' as const }]"
        />
        <UBadge :color="getCriticalityColor(data.data.businessCriticality)" variant="subtle" size="lg">
          {{ data.data.businessCriticality }}
        </UBadge>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Components</p>
            <p class="text-2xl font-bold mt-1">{{ data.data.componentCount || 0 }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Repositories</p>
            <p class="text-2xl font-bold mt-1">{{ data.data.repositoryCount || 0 }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Environment</p>
            <p class="text-2xl font-bold mt-1">{{ data.data.environment || '—' }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Criticality</p>
            <p class="text-2xl font-bold mt-1">{{ data.data.businessCriticality || '—' }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Last BOM Scan</p>
            <p class="text-2xl font-bold mt-1">{{ data.data.lastSbomScanAt ? formatDate(data.data.lastSbomScanAt) : '—' }}</p>
          </div>
        </UCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Basic Information</h2>
          </template>
          <div class="space-y-3">
            <div>
              <span class="text-sm text-(--ui-text-muted)">Domain</span>
              <p class="font-medium">{{ data.data.domain || '—' }}</p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">Environment</span>
              <p class="font-medium">{{ data.data.environment || '—' }}</p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">Business Criticality</span>
              <p class="font-medium">
                <UBadge :color="getCriticalityColor(data.data.businessCriticality)" variant="subtle">
                  {{ data.data.businessCriticality || '—' }}
                </UBadge>
              </p>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Ownership</h2>
          </template>
          <div class="space-y-3">
            <div>
              <span class="text-sm text-(--ui-text-muted)">Owner Team</span>
              <p v-if="data.data.ownerTeam" class="font-medium">
                <NuxtLink :to="`/teams/${encodeURIComponent(data.data.ownerTeam)}`" class="hover:underline">
                  {{ data.data.ownerTeam }}
                </NuxtLink>
              </p>
              <p v-else class="text-(--ui-text-muted)">No owner assigned</p>
            </div>
          </div>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Quick Actions</h2>
        </template>
        <div class="flex gap-4 flex-wrap">
          <UButton
            label="View All Components"
            :to="`/components?system=${encodeURIComponent(data.data.name)}`"
            variant="outline"
          />
        </div>
      </UCard>

      <UCard v-if="data.data.componentCount > 0">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-share-2" class="w-5 h-5 text-(--ui-primary)" />
            <h2 class="text-lg font-semibold">Dependency Graph</h2>
          </div>
          <p class="text-sm text-(--ui-text-muted) mt-1">
            Click a group to show direct dependencies. Click a component to drill into its dependencies.
          </p>
        </template>
        <ClientOnly>
          <AsyncSystemDependencyGraph
            :system-name="data.data.name"
            :nodes="graphData?.data?.nodes ?? []"
            :edges="graphData?.data?.edges ?? []"
          />
        </ClientOnly>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const route = useRoute()

const AsyncSystemDependencyGraph = defineAsyncComponent(() => import('../../../components/SystemDependencyGraph.vue'))

interface System {
  name: string
  domain: string
  ownerTeam: string | null
  businessCriticality: string
  environment: string
  componentCount: number
  repositoryCount: number
  lastSbomScanAt: string | null
}

interface SystemResponse {
  success: boolean
  data: System
}

interface GraphNode {
  id: string
  label: string
  type: 'system' | 'group' | 'component' | 'technology'
  packageManager?: string | null
  count?: number
  version?: string | null
  componentType?: string | null
  scope?: string | null
  purl?: string | null
  cpe?: string | null
  group?: string | null
  description?: string | null
  licenses?: Array<{ id?: string; name?: string; allowed?: boolean }>
  technologyName?: string | null
}

interface GraphEdge {
  source: string
  target: string
}

interface GraphResponse {
  success: boolean
  data: { nodes: GraphNode[]; edges: GraphEdge[] }
}

const { data, pending, error } = await useFetch<SystemResponse>(() => `/api/systems/${encodeURIComponent(route.params.name as string)}`)

// Graph data fetched in parallel — passed as a prop so the graph component
// stays purely presentational (no async setup, no hydration conflicts).
const { data: graphData } = useFetch<GraphResponse>(
  () => `/api/systems/${encodeURIComponent(route.params.name as string)}/graph`
)

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

function getCriticalityColor(criticality: string): 'error' | 'warning' | 'success' | 'neutral' {
  const colors: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error',
    high: 'warning',
    medium: 'success',
    low: 'neutral'
  }
  return colors[criticality?.toLowerCase()] || 'neutral'
}

useHead({
  title: computed(() => data.value?.data ? `${data.value.data.name} - Polaris` : 'System - Polaris')
})
</script>
