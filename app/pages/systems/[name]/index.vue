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
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-semibold">Overview</h2>
            <UButton
              label="View All Components"
              :to="`/components?system=${encodeURIComponent(data.data.name)}`"
              variant="outline"
              size="sm"
            />
          </div>
        </template>
        <EntityDescriptionList :items="overviewItems">
          <template #owner="{ item }">
            <p class="font-medium mt-0.5">
              <NuxtLink v-if="item.value" :to="`/teams/${encodeURIComponent(String(item.value))}`" class="hover:underline">
                {{ item.value }}
              </NuxtLink>
              <span v-else class="text-(--ui-text-muted)">No owner assigned</span>
            </p>
          </template>
          <template #criticality="{ item }">
            <div class="mt-0.5">
              <UBadge :color="getCriticalityColor(String(item.value))" variant="subtle">
                {{ item.value || '—' }}
              </UBadge>
            </div>
          </template>
        </EntityDescriptionList>
      </UCard>

      <SystemIssues v-if="issuesData?.data" :issues="issuesData.data" />

      <PaginatedTable
        v-if="repositories.length > 0"
        v-model:sorting="repoSorting"
        :data="repositories"
        :columns="repositoryColumns"
      >
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-git-branch" class="w-5 h-5 text-(--ui-primary)" />
            <h2 class="text-lg font-semibold">Repositories</h2>
          </div>
        </template>
      </PaginatedTable>

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
import { defineAsyncComponent, h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const route = useRoute()
const { getSortableHeader } = useSortableTable()

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

const overviewItems = computed(() => {
  const system = data.value?.data
  if (!system) return []
  return [
    { key: 'domain', label: 'Domain', value: system.domain },
    { key: 'environment', label: 'Environment', value: system.environment },
    { key: 'owner', label: 'Owner', value: system.ownerTeam },
    { key: 'criticality', label: 'Criticality', value: system.businessCriticality },
    { key: 'components', label: 'Components', value: system.componentCount || 0 },
    { key: 'repositories', label: 'Repositories', value: system.repositoryCount || 0 },
    { key: 'lastScan', label: 'Last BOM Scan', value: system.lastSbomScanAt ? formatDate(system.lastSbomScanAt) : null }
  ]
})

const repoSorting = ref([])

const repositoryColumns: TableColumn<Repository>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => getSortableHeader(column, 'Repository'),
    cell: ({ row }) => h(resolveComponent('NuxtLink'), {
      to: row.original.url,
      target: '_blank',
      rel: 'noopener noreferrer',
      class: 'flex items-center gap-2 font-medium hover:underline'
    }, () => [
      h(resolveComponent('UIcon'), { name: 'i-lucide-github', class: 'size-4 shrink-0 text-(--ui-text-muted)' }),
      row.original.name
    ])
  },
  {
    accessorKey: 'lastSbomScanAt',
    header: ({ column }) => getSortableHeader(column, 'Last Scan'),
    cell: ({ row }) => {
      const scanDate = row.original.lastSbomScanAt
      return scanDate ? formatDate(scanDate) : h('span', { class: 'text-(--ui-text-muted)' }, 'Not scanned')
    }
  }
]

useHead({
  title: computed(() => data.value?.data ? `${data.value.data.name} - Polaris` : 'System - Polaris')
})
</script>
