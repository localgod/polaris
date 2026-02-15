<template>
  <div class="space-y-6">
    <UPageHeader
      title="License Violations"
      description="Components using non-compliant licenses"
      :links="[{ label: 'Back to Violations', to: '/violations', icon: 'i-lucide-arrow-left', variant: 'outline' as const }]"
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
          :data="violations"
          :columns="columns"
          :loading="pending"
          class="flex-1"
        >
          <template #empty>
            <div class="text-center py-8">
              <UIcon name="i-lucide-check-circle" class="text-5xl text-(--ui-color-success-500)" />
              <h3 class="mt-4">No License Violations!</h3>
              <p class="text-(--ui-text-muted) mt-2">All components use compliant licenses.</p>
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

const { getSortableHeader } = useSortableTable()

interface LicenseViolation {
  team: string
  system: string
  component: {
    name: string
    version: string
    purl: string
  }
  license: {
    id: string
    name: string
    category: string
    osiApproved: boolean
  }
  policy: {
    name: string
    description: string
    severity: string
    ruleType: string
    enforcedBy: string
  }
}

interface LicenseViolationsResponse {
  success: boolean
  data: LicenseViolation[]
  count: number
  total?: number
}

function getCategoryColor(category: string): 'success' | 'warning' | 'error' | 'neutral' {
  const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    permissive: 'success',
    copyleft: 'warning',
    proprietary: 'error'
  }
  return colors[category] || 'neutral'
}

function getSeverityColor(severity: string): 'error' | 'warning' | 'success' | 'neutral' {
  const colors: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error',
    error: 'error',
    warning: 'warning',
    info: 'neutral'
  }
  return colors[severity] || 'neutral'
}

const columns: TableColumn<LicenseViolation>[] = [
  {
    accessorKey: 'component',
    header: 'Component',
    enableSorting: false,
    cell: ({ row }) => {
      const component = row.original.component
      return h('div', {}, [
        h('strong', {}, component.name),
        h('br'),
        h('code', { class: 'text-sm' }, component.version)
      ])
    }
  },
  {
    accessorKey: 'license',
    header: 'License',
    enableSorting: false,
    cell: ({ row }) => {
      const license = row.original.license
      return h(resolveComponent('UBadge'), {
        color: getCategoryColor(license.category),
        variant: 'subtle'
      }, () => license.id || license.name)
    }
  },
  {
    accessorKey: 'system',
    header: ({ column }) => getSortableHeader(column, 'System')
  },
  {
    accessorKey: 'team',
    header: ({ column }) => getSortableHeader(column, 'Team')
  },
  {
    accessorKey: 'policy',
    header: 'Severity',
    enableSorting: false,
    cell: ({ row }) => {
      const severity = row.original.policy.severity
      return h(resolveComponent('UBadge'), {
        color: getSeverityColor(severity),
        variant: 'subtle'
      }, () => severity)
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

const { data, pending, error } = await useFetch<LicenseViolationsResponse>('/api/policies/license-violations', {
  query: queryParams
})

const violations = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

useHead({ title: 'License Violations - Polaris' })
</script>
