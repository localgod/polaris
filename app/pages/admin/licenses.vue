<template>
  <div class="space-y-6">
    <UPageHeader
      title="License Administration"
      description="Manage license definitions and allowed status"
    />

    <UAlert
      v-if="error"
      color="error"
      :title="error.message || 'Failed to load licenses'"
      icon="i-lucide-circle-x"
    />

    <PaginatedTable
      v-else
      v-model:sorting="sorting"
      v-model:page="page"
      :manual-sorting="true"
      :data="licenses"
      :columns="columns"
      :loading="pending"
      :total="total"
      :page-size="pageSize"
    >
      <template #empty>
        <div class="text-center text-(--ui-text-muted) py-12">
          No licenses found.
        </div>
      </template>
    </PaginatedTable>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse } from '~~/types/api'

const { getSortableHeader } = useSortableTable()

interface License {
  spdxId: string
  name: string
  category: string
  osiApproved: boolean
}

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const columns: TableColumn<License>[] = [
  {
    accessorKey: 'spdxId',
    header: ({ column }) => getSortableHeader(column, 'SPDX ID'),
    cell: ({ row }) => h('code', {}, row.getValue('spdxId') as string)
  },
  {
    accessorKey: 'name',
    header: ({ column }) => getSortableHeader(column, 'Name')
  },
  {
    accessorKey: 'category',
    header: ({ column }) => getSortableHeader(column, 'Category'),
    cell: ({ row }) => {
      const category = row.getValue('category') as string
      return h(UBadge, { color: getCategoryColor(category), variant: 'subtle' }, () => category)
    }
  },
  {
    accessorKey: 'osiApproved',
    header: ({ column }) => getSortableHeader(column, 'OSI Approved'),
    cell: ({ row }) => {
      const osiApproved = row.getValue('osiApproved') as boolean
      return h(UBadge, { color: osiApproved ? 'success' : 'neutral', variant: 'subtle' }, () => osiApproved ? 'Yes' : 'No')
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
    cell: () => h(UButton, { variant: 'outline', size: 'xs', label: 'Edit' })
  }
]

const { sorting, page, pageSize, offset, sortBy, sortOrder } = usePaginatedSorting()

const { data, pending, error } = await useFetch<ApiResponse<License>>('/api/licenses', {
  query: { limit: pageSize, offset, sortBy, sortOrder }
})

const licenses = useApiData(data)
const total = useApiCount(data)

useHead({ title: 'License Administration - Polaris' })
</script>
