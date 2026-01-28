<template>
  
    <div class="space-y">
      <!-- Header -->
      <div class="page-header">
        <h1>Technologies</h1>
        <p>Approved technologies and their versions</p>
      </div>

      <!-- Error State -->
      <UiCard v-if="error">
        <div class="flex items-center" style="gap: 1rem; color: var(--color-error);">
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3>Error Loading Technologies</h3>
            <p class="text-sm">{{ error.message }}</p>
          </div>
        </div>
      </UiCard>

      <template v-else>
        <!-- Summary -->
        <div class="grid grid-cols-3">
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">Total Technologies</p>
              <p class="text-3xl font-bold" style="margin-top: 0.5rem;">{{ count }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">Categories</p>
              <p class="text-3xl font-bold text-primary" style="margin-top: 0.5rem;">{{ uniqueCategories.length }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">Vendors</p>
              <p class="text-3xl font-bold text-success" style="margin-top: 0.5rem;">{{ uniqueVendors.length }}</p>
            </div>
          </UiCard>
        </div>

        <!-- Technologies Table -->
        <UiCard>
          <UTable
            :data="technologies"
            :columns="columns"
            :loading="pending"
            class="flex-1"
          >
            <template #empty>
              <div class="text-center text-muted" style="padding: 3rem;">
                No technologies found.
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
import type { ApiResponse, Technology } from '~~/types/api'

const UiBadge = resolveComponent('UiBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UButton = resolveComponent('UButton')

const columns: TableColumn<Technology>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const tech = row.original
      return h('div', {}, [
        h('strong', {}, tech.name),
        tech.vendor ? h('p', { class: 'text-sm text-muted' }, tech.vendor) : null
      ].filter(Boolean))
    }
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => {
      const category = row.getValue('category') as string | undefined
      if (!category) return h('span', { class: 'text-muted' }, '—')
      return h(UiBadge, { variant: 'neutral' }, () => category)
    }
  },
  {
    accessorKey: 'approvedVersionRange',
    header: 'Version Range',
    cell: ({ row }) => {
      const version = row.getValue('approvedVersionRange') as string | undefined
      if (!version) return h('span', { class: 'text-muted' }, '—')
      return h('code', {}, version)
    }
  },
  {
    accessorKey: 'ownerTeam',
    header: 'Owner',
    cell: ({ row }) => {
      const owner = row.getValue('ownerTeam') as string | undefined
      if (!owner) return h('span', { class: 'text-muted' }, '—')
      return h('span', { class: 'font-medium' }, owner)
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
      const tech = row.original

      const items = [
        [
          {
            label: 'View Details',
            icon: 'i-lucide-eye',
            onSelect: () => navigateTo(`/technologies/${encodeURIComponent(tech.name)}`)
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

const { data, pending, error } = await useFetch<ApiResponse<Technology>>('/api/technologies', {
  query: queryParams
})

const technologies = computed(() => data.value?.data || [])
const count = useApiCount(data)
const total = computed(() => data.value?.total || data.value?.count || 0)

const uniqueCategories = computed(() => {
  const categories = new Set<string>()
  technologies.value.forEach(tech => {
    if (tech.category) categories.add(tech.category)
  })
  return Array.from(categories)
})

const uniqueVendors = computed(() => {
  const vendors = new Set<string>()
  technologies.value.forEach(tech => {
    if (tech.vendor) vendors.add(tech.vendor)
  })
  return Array.from(vendors)
})

useHead({
  title: 'Technologies - Polaris'
})
</script>
