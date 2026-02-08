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

const columns: TableColumn<Team>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
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
    header: 'Responsibility Area',
    cell: ({ row }) => {
      const area = row.getValue('responsibilityArea') as string | undefined
      if (!area) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return area
    }
  },
  {
    accessorKey: 'memberCount',
    header: 'Members',
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

const page = ref(1)
const pageSize = 20

const queryParams = computed(() => ({
  limit: pageSize,
  offset: (page.value - 1) * pageSize
}))

const { data, pending, error } = await useFetch<ApiResponse<Team>>('/api/teams', {
  query: queryParams
})

const teams = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

useHead({ title: 'Teams - Polaris' })
</script>
