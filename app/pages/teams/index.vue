<template>
  
    <div class="space-y">
      <div class="page-header">
        <h1>Teams</h1>
        <p>Organizational teams and their responsibilities</p>
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
            :data="teams"
            :columns="columns"
            :loading="pending"
            class="flex-1"
          >
            <template #empty>
              <div class="text-center text-muted" style="padding: 3rem;">
                No teams found.
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
  
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse, Team } from '~~/types/api'

const UDropdownMenu = resolveComponent('UDropdownMenu')
const UButton = resolveComponent('UButton')

const columns: TableColumn<Team>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => h('strong', {}, row.getValue('name') as string)
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => {
      const email = row.getValue('email') as string | undefined
      if (!email) return h('span', { class: 'text-muted' }, '—')
      return h('a', { href: `mailto:${email}` }, email)
    }
  },
  {
    accessorKey: 'responsibilityArea',
    header: 'Responsibility Area',
    cell: ({ row }) => {
      const area = row.getValue('responsibilityArea') as string | undefined
      if (!area) return h('span', { class: 'text-muted' }, '—')
      return area
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

const { data, pending, error } = await useFetch<ApiResponse<Team>>('/api/teams', {
  query: queryParams
})

const teams = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

useHead({ title: 'Teams - Polaris' })
</script>
