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
      <PaginatedTable
        v-model:sorting="sorting"
        v-model:page="page"
        :data="violations"
        :columns="columns"
        :loading="pending"
        :manual-sorting="true"
        :total="total"
        :page-size="pageSize"
      >
        <template #header>
          <UInput
            v-model="searchInput"
            placeholder="Filter by component, license, system, or team..."
            icon="i-lucide-search"
            class="max-w-sm"
          />
        </template>
        <template #empty>
          <div class="text-center py-8">
            <UIcon name="i-lucide-check-circle" class="text-5xl text-(--ui-color-success-500)" />
            <h3 class="mt-4">No License Violations!</h3>
            <p class="text-(--ui-text-muted) mt-2">All components use allowed licenses.</p>
          </div>
        </template>
      </PaginatedTable>
    </template>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse, LicenseViolation } from '~~/types/api'

definePageMeta({ middleware: 'auth' })

const { getSortableHeader } = useSortableTable()

const UBadge = resolveComponent('UBadge')
const NuxtLink = resolveComponent('NuxtLink')

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
    accessorKey: 'systemBusinessCriticality',
    header: ({ column }) => getSortableHeader(column, 'Criticality'),
    cell: ({ row }) => {
      const value = row.original.systemBusinessCriticality
      if (!value) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(UBadge, { color: getCriticalityColor(value), variant: 'subtle' }, () => value)
    }
  },
  {
    accessorKey: 'systemEnvironment',
    header: ({ column }) => getSortableHeader(column, 'Environment'),
    cell: ({ row }) => {
      const value = row.original.systemEnvironment
      if (!value) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(UBadge, { color: getEnvironmentColor(value), variant: 'subtle' }, () => value)
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

const searchInput = ref('')
const debouncedSearch = ref('')

const updateSearch = useDebounceFn((value: string) => { debouncedSearch.value = value }, 300)
watch(searchInput, updateSearch)

const { sorting, page, pageSize, offset, sortBy, sortOrder } = usePaginatedSorting({ resetOn: [debouncedSearch] })

const { data, pending, error } = await useFetch<ApiResponse<LicenseViolation>>('/api/licenses/violations', {
  query: { limit: pageSize, offset, sortBy, sortOrder, search: debouncedSearch }
})

const violations = useApiData(data)
const total = useApiCount(data)

useHead({ title: 'License Violations - Polaris' })
</script>
