<template>
  <div class="space-y-6">
    <USkeleton v-if="pending" class="h-96 w-full" />

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Error Loading Impact Graph"
      :description="error.message"
    >
      <template #actions>
        <UButton label="Back to Technology" :to="`/technologies/${encodeURIComponent(name)}`" variant="outline" />
      </template>
    </UAlert>

    <template v-else>
      <UPageHeader
        :title="`${name} — Impact`"
        description="Systems using this technology, their owning teams, and TIME governance status."
        :links="[{ label: 'Back to Technology', to: `/technologies/${encodeURIComponent(name)}`, icon: 'i-lucide-arrow-left', variant: 'outline' as const }]"
      />

      <UAlert
        v-if="overCap"
        color="warning"
        variant="subtle"
        icon="i-lucide-alert-triangle"
        title="Too many systems to graph"
        :description="`${systemRows.length} systems use ${name} — showing the table only. Graph view is limited to ${IMPACT_GRAPH_SYSTEM_LIMIT} systems to stay readable.`"
      />

      <UCard v-else-if="systemRows.length > 0">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-share-2" class="w-5 h-5 text-(--ui-primary)" />
            <h2 class="text-lg font-semibold">Impact Graph</h2>
          </div>
          <p class="text-sm text-(--ui-text-muted) mt-1">
            Diamond = technology. Circles = owning teams, colored by TIME status. Smaller circles = systems using it;
            dashed gray = no approval from the owning team.
          </p>
        </template>
        <ClientOnly>
          <AsyncTechnologyImpactGraph
            :technology-name="name"
            :nodes="impactGraph.nodes"
            :edges="impactGraph.edges"
          />
        </ClientOnly>
      </UCard>

      <PaginatedTable
        v-model:sorting="tableSorting"
        :data="systemRows"
        :columns="columns"
      >
        <template #header>
          <h2 class="text-lg font-semibold">Affected Systems ({{ systemRows.length }})</h2>
        </template>
        <template #empty>
          <div class="text-center text-(--ui-text-muted) py-8">
            No systems use this technology.
          </div>
        </template>
      </PaginatedTable>
    </template>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import {
  buildImpactGraph,
  IMPACT_GRAPH_SYSTEM_LIMIT,
  type TechnologyImpactSystemRow
} from '../../../utils/technology-impact-graph'

const route = useRoute()
const { getSortableHeader } = useSortableTable()
const name = computed(() => route.params.name as string)

const AsyncTechnologyImpactGraph = defineAsyncComponent(() => import('../../../components/TechnologyImpactGraph.vue'))

interface GraphResponse {
  success: boolean
  data: { technology: string; systems: TechnologyImpactSystemRow[] }
}

const { data, pending, error } = await useFetch<GraphResponse>(
  () => `/api/technologies/${encodeURIComponent(name.value)}/graph`
)

const systemRows = computed<TechnologyImpactSystemRow[]>(() => data.value?.data?.systems ?? [])
const overCap = computed(() => systemRows.value.length > IMPACT_GRAPH_SYSTEM_LIMIT)
const impactGraph = computed(() => buildImpactGraph(name.value, systemRows.value))

const tableSorting = ref([])

const columns: TableColumn<TechnologyImpactSystemRow>[] = [
  {
    accessorKey: 'systemName',
    header: ({ column }) => getSortableHeader(column, 'System'),
    cell: ({ row }) => h(resolveComponent('NuxtLink'), {
      to: `/systems/${encodeURIComponent(row.original.systemName)}`,
      class: 'font-medium hover:underline'
    }, () => row.original.systemName)
  },
  {
    accessorKey: 'ownerTeamName',
    header: ({ column }) => getSortableHeader(column, 'Owning Team'),
    cell: ({ row }) => {
      const team = row.original.ownerTeamName
      if (!team) return h('span', { class: 'text-(--ui-text-muted)' }, 'Unowned')
      return h(resolveComponent('NuxtLink'), {
        to: `/teams/${encodeURIComponent(team)}`,
        class: 'font-medium hover:underline'
      }, () => team)
    }
  },
  {
    accessorKey: 'time',
    header: ({ column }) => getSortableHeader(column, 'TIME'),
    cell: ({ row }) => {
      const time = row.original.time
      if (!time) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(resolveComponent('UBadge'), { color: getTimeCategoryColor(time), variant: 'subtle' }, () => time)
    }
  },
  {
    accessorKey: 'approved',
    header: ({ column }) => getSortableHeader(column, 'Compliance'),
    cell: ({ row }) => {
      const approved = row.original.approved
      return h(
        resolveComponent('UBadge'),
        { color: approved ? 'success' : 'error', variant: 'subtle' },
        () => approved ? 'Approved' : 'Compliance Gap'
      )
    }
  },
  {
    accessorKey: 'versions',
    header: 'Versions',
    cell: ({ row }) => h('code', { class: 'text-xs' }, row.original.versions.join(', '))
  }
]

useHead({
  title: computed(() => `${name.value} Impact - Polaris`)
})
</script>
