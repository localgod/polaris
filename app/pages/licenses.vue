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

interface License {
  id: string
  name: string
  category: string
  osiApproved: boolean
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
    header: 'SPDX ID',
    cell: ({ row }) => {
      const license = row.original
      if (license.url) {
        return h('a', {
          href: license.url,
          target: '_blank',
          rel: 'noopener noreferrer',
          class: 'font-medium hover:underline'
        }, license.id)
      }
      return h('span', { class: 'font-medium' }, license.id)
    }
  },
  {
    accessorKey: 'name',
    header: 'Name'
  },
  {
    accessorKey: 'category',
    header: 'Category',
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
    header: 'OSI Approved',
    cell: ({ row }) => {
      const approved = row.getValue('osiApproved') as boolean
      return h(resolveComponent('UBadge'), {
        color: approved ? 'success' : 'neutral',
        variant: 'subtle'
      }, () => approved ? 'Yes' : 'No')
    }
  },
  {
    accessorKey: 'componentCount',
    header: 'Components',
    cell: ({ row }) => String(row.getValue('componentCount') ?? 0)
  }
]

const page = ref(1)
const pageSize = 20

const queryParams = computed(() => ({
  limit: pageSize,
  offset: (page.value - 1) * pageSize
}))

const { data, pending, error } = await useFetch<LicenseResponse>('/api/licenses', {
  query: queryParams
})

const licenses = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

useHead({ title: 'License Inventory - Polaris' })
</script>
