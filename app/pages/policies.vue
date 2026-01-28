<template>
  <NuxtLayout name="default">
    <div class="space-y">
      <div>
        <h1>Policies</h1>
        <p class="text-muted" style="margin-top: 0.5rem;">Governance and compliance rules</p>
      </div>

      <UiCard v-if="error">
        <div class="flex items-center" style="gap: 1rem; color: var(--color-error);">
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3>Error</h3>
            <p class="text-sm">{{ error.message }}</p>
          </div>
        </div>
      </UiCard>

      <template v-else>
        <UiCard>
          <UTable
            :data="policies"
            :columns="columns"
            :loading="pending"
            class="flex-1"
          >
            <template #empty>
              <div class="text-center text-muted" style="padding: 3rem;">
                No policies found.
              </div>
            </template>
          </UTable>

          <div v-if="total > pageSize" class="flex justify-center border-t border-default pt-4 mt-4">
            <UPagination
              v-model:page="page"
              :total="total"
              :items-per-page="pageSize"
              :sibling-count="1"
              show-edges
            />
          </div>
        </UiCard>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse, Policy } from '~~/types/api'

const UiBadge = resolveComponent('UiBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UButton = resolveComponent('UButton')

function getSeverityVariant(severity: string) {
  const variants: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error',
    error: 'error',
    warning: 'warning',
    info: 'neutral'
  }
  return variants[severity] || 'neutral'
}

const columns: TableColumn<Policy>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const policy = row.original
      return h('div', {}, [
        h('strong', {}, policy.name),
        policy.description ? h('p', { class: 'text-sm text-muted' }, policy.description) : null
      ].filter(Boolean))
    }
  },
  {
    accessorKey: 'ruleType',
    header: 'Type',
    cell: ({ row }) => {
      const ruleType = row.getValue('ruleType') as string | undefined
      if (!ruleType) return h('span', { class: 'text-muted' }, '—')
      return ruleType
    }
  },
  {
    accessorKey: 'severity',
    header: 'Severity',
    cell: ({ row }) => {
      const severity = row.getValue('severity') as string | undefined
      if (!severity) return h('span', { class: 'text-muted' }, '—')
      return h(UiBadge, { variant: getSeverityVariant(severity) }, () => severity)
    }
  },
  {
    accessorKey: 'scope',
    header: 'Scope',
    cell: ({ row }) => {
      const scope = row.getValue('scope') as string | undefined
      if (!scope) return h('span', { class: 'text-muted' }, '—')
      return scope
    }
  },
  {
    accessorKey: 'enforcedBy',
    header: 'Enforced By',
    cell: ({ row }) => {
      const enforcedBy = row.getValue('enforcedBy') as string | undefined
      if (!enforcedBy) return h('span', { class: 'text-muted' }, '—')
      return enforcedBy
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string | undefined
      if (!status) return h('span', { class: 'text-muted' }, '—')
      return h(UiBadge, { variant: status === 'active' ? 'success' : 'neutral' }, () => status)
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

      return h(UDropdownMenu, {
        items,
        content: { align: 'end' }
      }, {
        default: () => h(UButton, {
          icon: 'i-lucide-ellipsis-vertical',
          color: 'neutral',
          variant: 'ghost',
          size: 'sm'
        })
      })
    }
  }
]

const page = ref(1)
const pageSize = 20

const queryParams = computed(() => ({
  limit: pageSize,
  offset: (page.value - 1) * pageSize
}))

const { data, pending, error } = await useFetch<ApiResponse<Policy>>('/api/policies', {
  query: queryParams
})

const policies = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

useHead({ title: 'Policies - Polaris' })
</script>
