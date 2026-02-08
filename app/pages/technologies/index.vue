<template>
  <div class="space-y-6">
    <UPageHeader
      title="Technologies"
      description="Governed technology choices across the organization"
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
          :data="technologies"
          :columns="columns"
          :loading="pending"
          class="flex-1"
        >
          <template #empty>
            <div class="text-center text-(--ui-text-muted) py-12">
              No technologies found.
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
import type { ApiResponse, Technology } from '~~/types/api'

function getTimeCategoryColor(category: string): 'success' | 'warning' | 'error' | 'neutral' {
  const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    invest: 'success',
    tolerate: 'warning',
    migrate: 'warning',
    eliminate: 'error'
  }
  return colors[category?.toLowerCase()] || 'neutral'
}

const columns: TableColumn<Technology>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const tech = row.original
      return h('div', {}, [
        h(resolveComponent('NuxtLink'), {
          to: `/technologies/${encodeURIComponent(tech.name)}`,
          class: 'font-medium hover:underline'
        }, () => tech.name),
        tech.description ? h('p', { class: 'text-sm text-(--ui-text-muted)' }, tech.description) : null
      ].filter(Boolean))
    }
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.getValue('type') as string | undefined
      if (!type) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(resolveComponent('UBadge'), { color: 'neutral', variant: 'subtle' }, () => type)
    }
  },
  {
    accessorKey: 'timeCategory',
    header: 'TIME',
    cell: ({ row }) => {
      const cat = row.getValue('timeCategory') as string | undefined
      if (!cat) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(resolveComponent('UBadge'), { color: getTimeCategoryColor(cat), variant: 'subtle' }, () => cat)
    }
  },
  {
    accessorKey: 'stewardTeam',
    header: 'Steward',
    cell: ({ row }) => {
      const team = row.getValue('stewardTeam') as string | undefined
      if (!team) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return team
    }
  },
  {
    accessorKey: 'versionCount',
    header: 'Versions',
    cell: ({ row }) => String(row.original.versionCount ?? 0)
  },
  {
    id: 'actions',
    header: '',
    meta: { class: { th: 'w-10', td: 'text-right' } },
    cell: ({ row }) => {
      const tech = row.original
      const items = [[
        { label: 'View Details', icon: 'i-lucide-eye', onSelect: () => navigateTo(`/technologies/${encodeURIComponent(tech.name)}`) }
      ]]
      return h(resolveComponent('UDropdownMenu'), { items, content: { align: 'end' } }, {
        default: () => h(resolveComponent('UButton'), { icon: 'i-lucide-ellipsis-vertical', color: 'neutral', variant: 'ghost', size: 'sm' })
      })
    }
  }
]

const page = ref(1)
const pageSize = 20
const queryParams = computed(() => ({ limit: pageSize, offset: (page.value - 1) * pageSize }))

const { data, pending, error } = await useFetch<ApiResponse<Technology>>('/api/technologies', { query: queryParams })

const technologies = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

useHead({ title: 'Technologies - Polaris' })
</script>
