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
      <UPageHeader
        :title="data.data.name"
        :links="[{ label: 'Back to Systems', to: '/systems', icon: 'i-lucide-arrow-left', variant: 'outline' as const }]"
      />

      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Overview</h2>
        </template>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
          <div>
            <span class="text-sm text-(--ui-text-muted)">Domain</span>
            <p class="font-medium mt-0.5">{{ data.data.domain || '—' }}</p>
          </div>
          <div>
            <span class="text-sm text-(--ui-text-muted)">Environment</span>
            <p class="font-medium mt-0.5">{{ data.data.environment || '—' }}</p>
          </div>
          <div>
            <span class="text-sm text-(--ui-text-muted)">Owner</span>
            <p class="font-medium mt-0.5">
              <NuxtLink
                v-if="data.data.ownerTeam"
                :to="`/teams/${encodeURIComponent(data.data.ownerTeam)}`"
                class="hover:underline"
              >
                {{ data.data.ownerTeam }}
              </NuxtLink>
              <span v-else class="text-(--ui-text-muted)">No owner assigned</span>
            </p>
          </div>
          <div>
            <span class="text-sm text-(--ui-text-muted)">Criticality</span>
            <div class="mt-0.5">
              <UBadge :color="getCriticalityColor(data.data.businessCriticality)" variant="subtle">
                {{ data.data.businessCriticality || '—' }}
              </UBadge>
            </div>
          </div>
          <div>
            <span class="text-sm text-(--ui-text-muted)">Components</span>
            <p class="font-medium mt-0.5">{{ data.data.componentCount || 0 }}</p>
          </div>
          <div>
            <span class="text-sm text-(--ui-text-muted)">Repositories</span>
            <p class="font-medium mt-0.5">{{ data.data.repositoryCount || 0 }}</p>
          </div>
          <div>
            <span class="text-sm text-(--ui-text-muted)">Last BOM Scan</span>
            <p class="font-medium mt-0.5">{{ data.data.lastSbomScanAt ? formatDate(data.data.lastSbomScanAt) : '—' }}</p>
          </div>
          <div class="flex items-end">
            <UButton
              label="View All Components"
              :to="`/components?system=${encodeURIComponent(data.data.name)}`"
              variant="outline"
              size="sm"
            />
          </div>
        </div>
      </UCard>

      <SystemIssues v-if="issuesData?.data" :issues="issuesData.data" />

      <UCard v-if="repositories.length > 0">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-git-branch" class="w-5 h-5 text-(--ui-primary)" />
            <h2 class="text-lg font-semibold">Repositories</h2>
          </div>
        </template>
        <div class="divide-y divide-(--ui-border)">
          <div v-for="repo in repositories" :key="repo.url" class="flex items-center justify-between gap-4 py-3">
            <NuxtLink :to="repo.url" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-sm font-medium hover:underline min-w-0">
              <UIcon name="i-lucide-github" class="size-4 shrink-0 text-(--ui-text-muted)" />
              <span class="truncate">{{ repo.name }}</span>
            </NuxtLink>
            <span class="text-xs text-(--ui-text-muted) shrink-0">
              {{ repo.lastSbomScanAt ? formatDate(repo.lastSbomScanAt) : 'Not scanned' }}
            </span>
          </div>
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

interface Advisory {
  id: string | null
  summary: string | null
  cvssScore: number | null
  publishedAt: string | null
}

interface DisallowedLicense {
  id: string | null
  name: string | null
  category: string | null
}

interface ComponentIssueRow {
  componentName: string
  componentVersion: string | null
  componentPurl: string | null
  isDirect: boolean
  advisories: Advisory[]
  disallowedLicenses: DisallowedLicense[]
  eolStatus: string | null
  eolDate: string | null
  isDeprecated: boolean
  maintenanceStatus: string | null
}

interface SystemIssues {
  vulnerabilities: ComponentIssueRow[]
  licenseIssues: ComponentIssueRow[]
  healthIssues: ComponentIssueRow[]
}

interface IssuesResponse {
  success: boolean
  data: SystemIssues
}

interface Repository {
  name: string
  url: string
  lastSbomScanAt: string | null
}

interface RepositoriesResponse {
  success: boolean
  data: Repository[]
}

const { data, pending, error } = await useFetch<SystemResponse>(() => `/api/systems/${encodeURIComponent(route.params.name as string)}`)

const { data: graphData } = useFetch<GraphResponse>(
  () => `/api/systems/${encodeURIComponent(route.params.name as string)}/graph`
)

const { data: issuesData } = useFetch<IssuesResponse>(
  () => `/api/systems/${encodeURIComponent(route.params.name as string)}/issues`
)

const { data: reposData } = useFetch<RepositoriesResponse>(
  () => `/api/systems/${encodeURIComponent(route.params.name as string)}/repositories`
)
const repositories = computed(() => reposData.value?.data ?? [])

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
