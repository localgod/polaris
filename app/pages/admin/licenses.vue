<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-3">
      <UPageHeader
        title="License Administration"
        description="Manage license definitions and allowed status"
      />
      <USwitch v-model="directOnly" label="Direct only" size="sm" />
    </div>

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
const toast = useToast()

interface License {
  id: string
  name: string
  category: string
  osiApproved: boolean
  allowed: boolean
}

const UBadge = resolveComponent('UBadge')
const USwitch = resolveComponent('USwitch')
const NuxtLink = resolveComponent('NuxtLink')

const columns: TableColumn<License>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => getSortableHeader(column, 'SPDX ID'),
    cell: ({ row }) => {
      const license = row.original
      return h(NuxtLink, {
        to: `/licenses/${encodeURIComponent(license.id)}`,
        class: 'hover:underline'
      }, () => h('code', {}, license.id))
    }
  },
  {
    accessorKey: 'name',
    header: ({ column }) => getSortableHeader(column, 'Name'),
    cell: ({ row }) => (row.getValue('name') as string) || h('span', { class: 'text-(--ui-text-muted)' }, '—')
  },
  {
    accessorKey: 'category',
    header: ({ column }) => getSortableHeader(column, 'Category'),
    cell: ({ row }) => {
      const category = row.getValue('category') as string
      if (!category) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
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
    accessorKey: 'allowed',
    header: 'Allowed',
    enableSorting: false,
    cell: ({ row }) => {
      const license = row.original
      return h(USwitch, {
        modelValue: license.allowed,
        'onUpdate:modelValue': () => toggleAllowed(license)
      })
    }
  }
]

async function toggleAllowed(license: License) {
  try {
    await $fetch('/api/admin/licenses/whitelist', {
      method: 'PUT',
      body: { licenseId: license.id, allowed: !license.allowed }
    })
    await refreshNuxtData()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    toast.add({ title: 'Error', description: err.data?.message || err.message || 'Failed to update license status', color: 'error' })
  }
}

const directOnly = ref(true)

const { sorting, page, pageSize, offset, sortBy, sortOrder } = usePaginatedSorting({
  resetOn: [directOnly]
})

const { data, pending, error } = await useFetch<ApiResponse<License>>('/api/licenses', {
  query: { limit: pageSize, offset, sortBy, sortOrder, direct: directOnly }
})

const licenses = useApiData(data)
const total = useApiCount(data)

useHead({ title: 'License Administration - Polaris' })
</script>
