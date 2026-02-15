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
      <UCard>
        <UTable
          v-model:sorting="sorting"
          :manual-sorting="true"
          :data="licenses"
          :columns="columns"
          :loading="pending"
          class="flex-1"
        >
          <template #empty>
            <div class="text-center text-(--ui-text-muted) py-12">
              No licenses found.
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

const { getSortableHeader } = useSortableTable()
const { data: session } = useAuth()

interface License {
  id: string
  name: string
  category: string
  osiApproved: boolean
  whitelisted: boolean
  componentCount: number
  url: string | null
}

interface LicenseResponse {
  success: boolean
  data: License[]
  count: number
  total?: number
}

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
    accessorKey: 'whitelisted',
    header: ({ column }) => getSortableHeader(column, 'Status'),
    cell: ({ row }) => {
      const whitelisted = row.getValue('whitelisted') as boolean
      return h(resolveComponent('UBadge'), {
        color: whitelisted ? 'success' : 'neutral',
        variant: 'subtle'
      }, () => whitelisted ? 'Enabled' : 'Disabled')
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
      const isSuperuser = session.value?.user?.role === 'superuser'
      const menuItems = [[
        {
          label: 'View Details',
          icon: 'i-lucide-file-text',
          onSelect: () => navigateTo(`/licenses/${encodeURIComponent(license.id)}`)
        },
        ...(isSuperuser
          ? [{
              label: license.whitelisted ? 'Disable' : 'Enable',
              icon: license.whitelisted ? 'i-lucide-ban' : 'i-lucide-check-circle',
              onSelect: () => toggleWhitelist(license)
            }]
          : [])
      ]]
      return h(resolveComponent('UDropdownMenu'), { items: menuItems, content: { align: 'end' as const } }, {
        default: () => h(resolveComponent('UButton'), { icon: 'i-lucide-ellipsis-vertical', color: 'neutral', variant: 'ghost', size: 'sm' })
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

const { data, pending, error } = await useFetch<LicenseResponse>('/api/licenses', {
  query: queryParams
})

const licenses = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

async function toggleWhitelist(license: License) {
  try {
    await $fetch('/api/admin/licenses/whitelist', {
      method: 'PUT',
      body: { licenseId: license.id, whitelisted: !license.whitelisted }
    })
    await refreshNuxtData()
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to update license status'
    console.error('Toggle whitelist error:', message)
  }
}

useHead({ title: 'License Inventory - Polaris' })
</script>
