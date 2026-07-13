<template>
  <div class="space-y-6">
    <UPageHeader
      title="Version Sprawl"
      description="Technologies with multiple versions declared as direct dependencies across systems, ranked by consolidation priority"
    />

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Error"
      :description="error.message"
    />

    <template v-else>
      <EntityStatStrip v-if="summary" :items="summaryStats" />

      <PaginatedTable
        :data="detections"
        :columns="columns"
        :loading="pending"
      >
        <template #header>
          <div class="flex flex-wrap items-center gap-2">
            <USelect
              v-model="severityFilter"
              :items="severityItems"
              placeholder="All severities"
              class="w-40"
            />
            <UButton
              v-if="severityFilter"
              label="Clear"
              variant="ghost"
              color="neutral"
              icon="i-lucide-x"
              @click="severityFilter = undefined"
            />
          </div>
        </template>
        <template #empty>
          <div class="text-center py-8">
            <UIcon name="i-lucide-check-circle" class="text-5xl text-(--ui-color-success-500)" />
            <h3 class="mt-4">No Version Sprawl Detected!</h3>
            <p class="text-(--ui-text-muted) mt-2">No technology has more than one version declared as a direct dependency.</p>
          </div>
        </template>
      </PaginatedTable>
    </template>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse, VersionSprawlDetection } from '~~/types/api'

const { getSortableHeader } = useSortableTable()

const UBadge = resolveComponent('UBadge')
const NuxtLink = resolveComponent('NuxtLink')

const severityItems = ['high', 'medium', 'low']
const severityFilter = ref<string | undefined>(undefined)

const queryParams = computed(() => {
  const params: Record<string, string> = {}
  if (severityFilter.value) params.severity = severityFilter.value
  return params
})

const { data, pending, error } = await useFetch<ApiResponse<VersionSprawlDetection>>('/api/version-sprawl', {
  query: queryParams
})

interface SummaryResponse {
  success: boolean
  data: { high: number; medium: number; low: number; total: number }
}

const { data: summaryData } = await useFetch<SummaryResponse>('/api/version-sprawl/summary')

const detections = useApiData(data)
const summary = computed(() => summaryData.value?.data)
const summaryStats = computed(() => summary.value
  ? [
      { label: 'Total', value: summary.value.total },
      { label: 'High', value: summary.value.high },
      { label: 'Medium', value: summary.value.medium },
      { label: 'Low', value: summary.value.low }
    ]
  : [])

const columns: TableColumn<VersionSprawlDetection>[] = [
  {
    id: 'technologyName',
    accessorFn: row => row.technologyName,
    header: ({ column }) => getSortableHeader(column, 'Technology'),
    cell: ({ row }) => h(NuxtLink, {
      to: `/technologies/${encodeURIComponent(row.original.technologyName)}`,
      class: 'hover:underline font-medium'
    }, () => row.original.technologyName)
  },
  {
    id: 'severity',
    accessorFn: row => row.severity,
    header: ({ column }) => getSortableHeader(column, 'Severity'),
    cell: ({ row }) => h(UBadge, {
      color: getSprawlSeverityColor(row.original.severity),
      variant: 'subtle'
    }, () => row.original.severity)
  },
  {
    id: 'sprawlScore',
    accessorFn: row => row.sprawlScore,
    header: ({ column }) => getSortableHeader(column, 'Score'),
    cell: ({ row }) => row.original.sprawlScore
  },
  {
    id: 'versionCount',
    accessorFn: row => row.versionCount,
    header: ({ column }) => getSortableHeader(column, 'Versions'),
    cell: ({ row }) => h('div', {}, [
      h('span', {}, `${row.original.versionCount} versions`),
      h('p', { class: 'text-sm text-(--ui-text-muted)' }, `${row.original.versionRange.oldest} → ${row.original.versionRange.newest}`)
    ])
  },
  {
    id: 'affectedSystemCount',
    accessorFn: row => row.affectedSystemCount,
    header: ({ column }) => getSortableHeader(column, 'Systems'),
    cell: ({ row }) => row.original.affectedSystemCount
  },
  {
    id: 'recommendedVersion',
    accessorFn: row => row.recommendedVersion,
    header: 'Recommended',
    cell: ({ row }) => h('code', { class: 'text-sm' }, row.original.recommendedVersion)
  },
  {
    id: 'hasEolVersion',
    accessorFn: row => row.hasEolVersion,
    header: 'EOL',
    cell: ({ row }) => row.original.hasEolVersion
      ? h(UBadge, { color: 'error', variant: 'subtle' }, () => 'EOL version in use')
      : h('span', { class: 'text-(--ui-text-muted)' }, '—')
  }
]

useHead({ title: 'Version Sprawl - Polaris' })
</script>
