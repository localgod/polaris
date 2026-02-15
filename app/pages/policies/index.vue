<template>
  <div class="space-y-6">
    <UPageHeader
      title="Policies"
      description="Governance and compliance rules"
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
      <UCard>
        <UTable
          v-model:sorting="sorting"
          :manual-sorting="true"
          :data="policies"
          :columns="columns"
          :loading="pending"
          class="flex-1"
        >
          <template #empty>
            <div class="text-center text-(--ui-text-muted) py-12">
              No policies found.
            </div>
          </template>
        </UTable>

        <div v-if="total > pageSize" class="flex justify-center border-t border-(--ui-border) pt-4 mt-4">
          <UPagination
            v-model:page="page"
            :total="total"
            :items-per-page="pageSize"
            :sibling-count="1"
            show-edges
          />
        </div>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse, Policy } from '~~/types/api'

const { getSortableHeader } = useSortableTable()

function getSeverityColor(severity: string): 'error' | 'warning' | 'success' | 'neutral' {
  const colors: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error',
    error: 'error',
    warning: 'warning',
    info: 'neutral'
  }
  return colors[severity] || 'neutral'
}

const columns: TableColumn<Policy>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => getSortableHeader(column, 'Name'),
    cell: ({ row }) => {
      const policy = row.original
      return h('div', {}, [
        h('strong', {}, policy.name),
        policy.description ? h('p', { class: 'text-sm text-(--ui-text-muted)' }, policy.description) : null
      ].filter(Boolean))
    }
  },
  {
    accessorKey: 'ruleType',
    header: ({ column }) => getSortableHeader(column, 'Type'),
    cell: ({ row }) => {
      const ruleType = row.getValue('ruleType') as string | undefined
      if (!ruleType) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return ruleType
    }
  },
  {
    accessorKey: 'severity',
    header: ({ column }) => getSortableHeader(column, 'Severity'),
    cell: ({ row }) => {
      const severity = row.getValue('severity') as string | undefined
      if (!severity) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(resolveComponent('UBadge'), { color: getSeverityColor(severity), variant: 'subtle' }, () => severity)
    }
  },
  {
    accessorKey: 'scope',
    header: ({ column }) => getSortableHeader(column, 'Scope'),
    cell: ({ row }) => {
      const scope = row.getValue('scope') as string | undefined
      if (!scope) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return scope
    }
  },
  {
    accessorKey: 'enforcedBy',
    header: ({ column }) => getSortableHeader(column, 'Enforced By'),
    cell: ({ row }) => {
      const enforcedBy = row.getValue('enforcedBy') as string | undefined
      if (!enforcedBy) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return enforcedBy
    }
  },
  {
    accessorKey: 'status',
    header: ({ column }) => getSortableHeader(column, 'Status'),
    cell: ({ row }) => {
      const status = row.getValue('status') as string | undefined
      if (!status) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(resolveComponent('UBadge'), { color: status === 'active' ? 'success' : 'neutral', variant: 'subtle' }, () => status)
    }
  },
  {
    id: 'actions',
    header: '',
    meta: {
      class: {
        th: 'w-10',
        td: 'text-right'
      }
    },
    cell: ({ row }) => {
      const policy = row.original

      const items = [
        [
          {
            label: 'View Details',
            icon: 'i-lucide-eye',
            onSelect: () => navigateTo(`/policies/${encodeURIComponent(policy.name)}`)
          }
        ]
      ]

      return h(resolveComponent('UDropdownMenu'), {
        items,
        content: { align: 'end' }
      }, {
        default: () => h(resolveComponent('UButton'), {
          icon: 'i-lucide-ellipsis-vertical',
          color: 'neutral',
          variant: 'ghost',
          size: 'sm'
        })
      })
    }
  }
]

const sorting = ref([])
watch(sorting, () => { page.value = 1 })
const page = ref(1)
const pageSize = 20

const queryParams = computed(() => {
  const params: Record<string, string | number> = { limit: pageSize, offset: (page.value - 1) * pageSize }
  if (sorting.value.length) {
    params.sortBy = sorting.value[0].id
    params.sortOrder = sorting.value[0].desc ? 'desc' : 'asc'
  }
  return params
})

const { data, pending, error } = await useFetch<ApiResponse<Policy>>('/api/policies', {
  query: queryParams
})

const policies = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

useHead({ title: 'Policies - Polaris' })
</script>
