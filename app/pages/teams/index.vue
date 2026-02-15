<template>
  <div class="space-y-6">
    <UPageHeader
      title="Teams"
      description="Organizational teams and their technology ownership"
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
          :data="teams"
          :columns="columns"
          :loading="pending"
          class="flex-1"
        >
          <template #empty>
            <div class="text-center text-(--ui-text-muted) py-12">
              No teams found.
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
import type { ApiResponse, Team } from '~~/types/api'

const { getSortableHeader } = useSortableTable()

const columns: TableColumn<Team>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => getSortableHeader(column, 'Name'),
    cell: ({ row }) => {
      const team = row.original
      return h('div', {}, [
        h(resolveComponent('NuxtLink'), {
          to: `/teams/${encodeURIComponent(team.name)}`,
          class: 'font-medium hover:underline'
        }, () => team.name),
        team.description ? h('p', { class: 'text-sm text-(--ui-text-muted)' }, team.description) : null
      ].filter(Boolean))
    }
  },
  {
    accessorKey: 'responsibilityArea',
    header: ({ column }) => getSortableHeader(column, 'Responsibility Area'),
    cell: ({ row }) => {
      const area = row.getValue('responsibilityArea') as string | undefined
      if (!area) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return area
    }
  },
  {
    accessorKey: 'memberCount',
    header: ({ column }) => getSortableHeader(column, 'Members'),
    cell: ({ row }) => {
      const count = row.getValue('memberCount') as number | undefined
      return String(count ?? 0)
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
      const team = row.original

      const items = [
        [
          {
            label: 'View Details',
            icon: 'i-lucide-eye',
            onSelect: () => navigateTo(`/teams/${encodeURIComponent(team.name)}`)
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

const { data, pending, error } = await useFetch<ApiResponse<Team>>('/api/teams', {
  query: queryParams
})

const teams = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

useHead({ title: 'Teams - Polaris' })
</script>
