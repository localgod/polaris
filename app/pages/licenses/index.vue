<template>
  <div class="space-y-6">
    <UPageHeader
      title="License Inventory"
      description="Licenses discovered across all components"
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
        :manual-sorting="true"
        :data="licenses"
        :columns="columns"
        :loading="pending"
        :total="total"
        :page-size="pageSize"
      >
        <template #header>
          <TableSearchHeader v-model="searchInput" />
        </template>
        <template #empty>
          <div class="text-center text-(--ui-text-muted) py-12">
            No licenses found.
          </div>
        </template>
      </PaginatedTable>
    </template>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse } from '~~/types/api'

const { getSortableHeader } = useSortableTable()
const { isSuperuser: isSuperuserRef } = useEffectiveRole()
const toast = useToast()

interface License {
  id: string
  name: string
  category: string
  osiApproved: boolean
  allowed: boolean
  componentCount: number
  url: string | null
}

const columns: TableColumn<License>[] = [
  {
    accessorKey: 'id',
    header: ({ column }) => getSortableHeader(column, 'SPDX ID'),
    cell: ({ row }) => {
      const license = row.original
      return h(resolveComponent('NuxtLink'), {
        to: `/licenses/${encodeURIComponent(license.id)}`,
        class: 'font-medium hover:underline'
      }, () => license.id)
    }
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
      if (!category) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(resolveComponent('UBadge'), {
        color: getCategoryColor(category),
        variant: 'subtle'
      }, () => category)
    }
  },
  {
    accessorKey: 'osiApproved',
    header: ({ column }) => getSortableHeader(column, 'OSI Approved'),
    cell: ({ row }) => {
      const approved = row.getValue('osiApproved') as boolean
      return h(resolveComponent('UBadge'), {
        color: approved ? 'success' : 'neutral',
        variant: 'subtle'
      }, () => approved ? 'Yes' : 'No')
    }
  },
  {
    accessorKey: 'allowed',
    header: ({ column }) => getSortableHeader(column, 'Status'),
    cell: ({ row }) => {
      const allowed = row.getValue('allowed') as boolean
      return h(resolveComponent('UBadge'), {
        color: allowed ? 'success' : 'error',
        variant: 'subtle'
      }, () => allowed ? 'Allowed' : 'Disallowed')
    }
  },
  {
    accessorKey: 'componentCount',
    header: ({ column }) => getSortableHeader(column, 'Components'),
    cell: ({ row }) => String(row.getValue('componentCount') ?? 0)
  },
  {
    id: 'actions',
    header: '',
    meta: { class: { th: 'w-10', td: 'text-right' } },
    cell: ({ row }) => {
      const license = row.original
      const isSuperuser = isSuperuserRef.value
      const menuItems = [[
        {
          label: 'View Details',
          icon: 'i-lucide-file-text',
          onSelect: () => navigateTo(`/licenses/${encodeURIComponent(license.id)}`)
        },
        ...(isSuperuser
          ? [{
              label: license.allowed ? 'Disallow' : 'Allow',
              icon: license.allowed ? 'i-lucide-ban' : 'i-lucide-check-circle',
              onSelect: () => toggleAllowed(license)
            }]
          : [])
      ]]
      return h(resolveComponent('UDropdownMenu'), { items: menuItems, content: { align: 'end' as const } }, {
        default: () => h(resolveComponent('UButton'), { icon: 'i-lucide-ellipsis-vertical', color: 'neutral', variant: 'ghost', size: 'sm' })
      })
    }
  }
]

const { searchInput, debouncedSearch } = useTableSearch()

const { sorting, page, pageSize, offset, sortBy, sortOrder } = usePaginatedSorting({
  resetOn: [debouncedSearch]
})

// Pass individual refs/computeds as query values so each one is tracked
// as a reactive dependency — wrapping the query in computed() causes hydration issues
const { data, pending, error } = await useFetch<ApiResponse<License>>('/api/licenses', {
  query: {
    limit: pageSize,
    offset,
    sortBy,
    sortOrder,
    search: debouncedSearch
  }
})

const licenses = useApiData(data)
const total = useApiCount(data)

async function toggleAllowed(license: License) {
  try {
    await $fetch('/api/admin/licenses/whitelist', {
      method: 'PUT',
      body: { licenseId: license.id, allowed: !license.allowed }
    })
    await refreshNuxtData()
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to update license status'
    toast.add({ title: 'Error', description: message, color: 'error' })
  }
}

useHead({ title: 'License Inventory - Polaris' })
</script>
