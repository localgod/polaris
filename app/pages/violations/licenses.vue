<template>
  <div class="space-y-6">
    <UPageHeader
      title="License Violations"
      description="Components using disallowed licenses"
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
        <div class="flex items-center gap-2 pb-4 border-b border-(--ui-border) mb-4">
          <UInput
            v-model="searchInput"
            placeholder="Filter by component, license, system, or team..."
            icon="i-lucide-search"
            class="max-w-sm"
          />
        </div>

        <UTable
          v-model:sorting="sorting"
          :data="violations"
          :columns="columns"
          :loading="pending"
          :manual-sorting="true"
          class="flex-1"
        >
          <template #empty>
            <div class="text-center py-8">
              <UIcon name="i-lucide-check-circle" class="text-5xl text-(--ui-color-success-500)" />
              <h3 class="mt-4">No License Violations!</h3>
              <p class="text-(--ui-text-muted) mt-2">All components use allowed licenses.</p>
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
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse, LicenseViolation } from '~~/types/api'

const { getSortableHeader } = useSortableTable()

const UBadge = resolveComponent('UBadge')
const NuxtLink = resolveComponent('NuxtLink')

function getCategoryColor(category: string): 'success' | 'warning' | 'error' | 'neutral' {
  const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    permissive: 'success',
    'weak-copyleft': 'warning',
    copyleft: 'warning',
    'strong-copyleft': 'error',
    proprietary: 'error',
    'public-domain': 'success'
  }
  return colors[category?.toLowerCase()] || 'neutral'
}

const columns: TableColumn<LicenseViolation>[] = [
  {
    accessorKey: 'componentName',
    header: ({ column }) => getSortableHeader(column, 'Component'),
    cell: ({ row }) => {
      return h('div', {}, [
        h('strong', {}, row.original.componentName),
        h('br'),
        h('code', { class: 'text-sm' }, row.original.componentVersion)
      ])
    }
  },
  {
    accessorKey: 'licenseId',
    header: ({ column }) => getSortableHeader(column, 'License'),
    cell: ({ row }) => {
      const v = row.original
      return h(NuxtLink, {
        to: `/licenses/${encodeURIComponent(v.licenseId)}`,
        class: 'hover:underline'
      }, () => h(UBadge, {
        color: getCategoryColor(v.licenseCategory || ''),
        variant: 'subtle'
      }, () => v.licenseId))
    }
  },
  {
    accessorKey: 'systemName',
    header: ({ column }) => getSortableHeader(column, 'System'),
    cell: ({ row }) => {
      return h(NuxtLink, {
        to: `/systems/${encodeURIComponent(row.original.systemName)}`,
        class: 'hover:underline'
      }, () => row.original.systemName)
    }
  },
  {
    accessorKey: 'teamName',
    header: ({ column }) => getSortableHeader(column, 'Team'),
    cell: ({ row }) => {
      return h(NuxtLink, {
        to: `/teams/${encodeURIComponent(row.original.teamName)}`,
        class: 'hover:underline'
      }, () => row.original.teamName)
    }
  }
]

const sorting = ref<{ id: string; desc: boolean }[]>([])

watch(sorting, () => { page.value = 1 })

const page = ref(1)
const pageSize = 20

const searchInput = ref('')
const debouncedSearch = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchInput, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedSearch.value = value
    page.value = 1
  }, 300)
})

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

const queryParams = computed(() => {
  const params: Record<string, string | number> = {
    limit: pageSize,
    offset: (page.value - 1) * pageSize
  }
  if (debouncedSearch.value) {
    params.search = debouncedSearch.value
  }
  if (sorting.value.length) {
    params.sortBy = sorting.value[0].id
    params.sortOrder = sorting.value[0].desc ? 'desc' : 'asc'
  }
  return params
})

const { data, pending, error } = await useFetch<ApiResponse<LicenseViolation>>('/api/licenses/violations', {
  query: queryParams
})

const violations = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || 0)

useHead({ title: 'License Violations - Polaris' })
</script>
