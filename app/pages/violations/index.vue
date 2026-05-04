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

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Error"
      :description="error.message"
    />

    <template v-else>
      <!-- Summary -->
      <div v-if="summary" class="grid grid-cols-4 gap-4">
        <UCard v-for="(count, level) in summary" :key="level">
          <div class="text-center">
            <p class="text-2xl font-bold">{{ count }}</p>
            <p class="text-sm text-(--ui-text-muted) capitalize">{{ level }}</p>
          </div>
        </UCard>
      </div>

      <UCard>
        <div class="flex flex-wrap items-center gap-2 pb-4 border-b border-(--ui-border) mb-4">
          <USelect
            v-model="severityFilter"
            :items="severityItems"
            placeholder="All severities"
            class="w-40"
          />
          <UInput
            v-model="teamFilter"
            placeholder="Filter by team..."
            icon="i-lucide-search"
            class="max-w-xs"
          />
          <UInput
            v-model="technologyFilter"
            placeholder="Filter by technology..."
            icon="i-lucide-search"
            class="max-w-xs"
          />
          <UButton
            v-if="severityFilter || teamFilter || technologyFilter"
            label="Clear"
            variant="ghost"
            color="neutral"
            icon="i-lucide-x"
            @click="clearFilters"
          />
        </div>

        <UTable
          :data="violations"
          :columns="columns"
          :loading="pending"
          class="flex-1"
        >
          <template #empty>
            <div class="text-center py-8">
              <UIcon name="i-lucide-check-circle" class="text-5xl text-(--ui-color-success-500)" />
              <h3 class="mt-4">No Version Violations!</h3>
              <p class="text-(--ui-text-muted) mt-2">All components are within allowed version ranges.</p>
            </div>
          </template>
        </UTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ middleware: 'auth' })

interface Violation {
  team: string
  system: string
  systemBusinessCriticality: string | null
  systemEnvironment: string | null
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

const { getSortableHeader } = useSortableTable()

const UBadge = resolveComponent('UBadge')
const NuxtLink = resolveComponent('NuxtLink')

function getSeverityColor(severity: string): 'error' | 'warning' | 'success' | 'neutral' {
  const colors: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error', error: 'error', warning: 'warning', info: 'neutral'
  }
  return colors[severity] || 'neutral'
}

function getCriticalityColor(criticality: string | null): 'error' | 'warning' | 'success' | 'neutral' {
  const colors: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error', high: 'warning', medium: 'success', low: 'neutral'
  }
  return colors[criticality || ''] || 'neutral'
}

function getEnvironmentColor(environment: string | null): 'error' | 'warning' | 'success' | 'neutral' {
  const colors: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    prod: 'error', staging: 'warning', test: 'neutral', dev: 'neutral'
  }
  return colors[environment || ''] || 'neutral'
}

const severityItems = ['critical', 'error', 'warning', 'info']

const severityFilter = ref<string | undefined>(undefined)
const teamFilter = ref('')
const technologyFilter = ref('')

function clearFilters() {
  severityFilter.value = undefined
  teamFilter.value = ''
  technologyFilter.value = ''
}

const queryParams = computed(() => {
  const params: Record<string, string> = {}
  if (severityFilter.value) params.severity = severityFilter.value
  if (teamFilter.value) params.team = teamFilter.value
  if (technologyFilter.value) params.technology = technologyFilter.value
  return params
})

const { data, pending, error } = await useFetch<ViolationsResponse>('/api/version-constraints/violations', {
  query: queryParams
})

const violations = computed(() => data.value?.data || [])
const summary = computed(() => data.value?.summary)

const columns: TableColumn<Violation>[] = [
  {
    id: 'constraint',
    accessorFn: row => row.constraint.name,
    header: ({ column }) => getSortableHeader(column, 'Constraint'),
    cell: ({ row }) => {
      return h('div', {}, [
        h('strong', {}, row.original.constraint.name),
        row.original.constraint.description
          ? h('p', { class: 'text-sm text-(--ui-text-muted)' }, row.original.constraint.description)
          : null
      ].filter(Boolean))
    }
  },
  {
    id: 'severity',
    accessorFn: row => row.constraint.severity,
    header: ({ column }) => getSortableHeader(column, 'Severity'),
    cell: ({ row }) => {
      return h(UBadge, {
        color: getSeverityColor(row.original.constraint.severity),
        variant: 'subtle'
      }, () => row.original.constraint.severity)
    }
  },
  {
    id: 'component',
    accessorFn: row => row.component,
    header: ({ column }) => getSortableHeader(column, 'Component'),
    cell: ({ row }) => {
      return h('div', {}, [
        h('strong', {}, row.original.component),
        h('br'),
        h('code', { class: 'text-sm' }, row.original.componentVersion)
      ])
    }
  },
  {
    id: 'versionRange',
    accessorFn: row => row.constraint.versionRange ?? '',
    header: ({ column }) => getSortableHeader(column, 'Required Range'),
    cell: ({ row }) => {
      const range = row.original.constraint.versionRange
      if (!range) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h('code', { class: 'text-sm' }, range)
    }
  },
  {
    id: 'technology',
    accessorFn: row => row.technology,
    header: ({ column }) => getSortableHeader(column, 'Technology'),
    cell: ({ row }) => {
      return h(NuxtLink, {
        to: `/technologies/${encodeURIComponent(row.original.technology)}`,
        class: 'hover:underline'
      }, () => row.original.technology)
    }
  },
  {
    id: 'system',
    accessorFn: row => row.system,
    header: ({ column }) => getSortableHeader(column, 'System'),
    cell: ({ row }) => {
      return h(NuxtLink, {
        to: `/systems/${encodeURIComponent(row.original.system)}`,
        class: 'hover:underline'
      }, () => row.original.system)
    }
  },
  {
    id: 'systemBusinessCriticality',
    accessorFn: row => row.systemBusinessCriticality ?? '',
    header: ({ column }) => getSortableHeader(column, 'Criticality'),
    cell: ({ row }) => {
      const value = row.original.systemBusinessCriticality
      if (!value) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(UBadge, { color: getCriticalityColor(value), variant: 'subtle' }, () => value)
    }
  },
  {
    id: 'systemEnvironment',
    accessorFn: row => row.systemEnvironment ?? '',
    header: ({ column }) => getSortableHeader(column, 'Environment'),
    cell: ({ row }) => {
      const value = row.original.systemEnvironment
      if (!value) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(UBadge, { color: getEnvironmentColor(value), variant: 'subtle' }, () => value)
    }
  },
  {
    id: 'team',
    accessorFn: row => row.team,
    header: ({ column }) => getSortableHeader(column, 'Team'),
    cell: ({ row }) => {
      return h(NuxtLink, {
        to: `/teams/${encodeURIComponent(row.original.team)}`,
        class: 'hover:underline'
      }, () => row.original.team)
    }
  }
]

useHead({ title: 'Violations - Polaris' })
</script>
