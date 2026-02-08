<template>
  <div class="space-y-6">
    <UPageHeader
      title="License Administration"
      description="Manage license definitions and policies"
    />

    <UAlert
      v-if="error"
      color="error"
      :title="error.message || 'Failed to load licenses'"
      icon="i-lucide-circle-x"
    />

    <UCard v-else>
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
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

interface License {
  spdxId: string
  name: string
  category: string
  osiApproved: boolean
}

interface LicenseResponse {
  success: boolean
  data: License[]
  count: number
  total?: number
}

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

function getCategoryColor(category: string) {
  const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    permissive: 'success',
    copyleft: 'warning',
    proprietary: 'error'
  }
  return colors[category] || 'neutral'
}

const columns: TableColumn<License>[] = [
  {
    accessorKey: 'spdxId',
    header: 'SPDX ID',
    cell: ({ row }) => h('code', {}, row.getValue('spdxId') as string)
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
      return h(UBadge, { color: getCategoryColor(category), variant: 'subtle' }, () => category)
    }
  },
  {
    accessorKey: 'osiApproved',
    header: 'OSI Approved',
    cell: ({ row }) => {
      const osiApproved = row.getValue('osiApproved') as boolean
      return h(UBadge, { color: osiApproved ? 'success' : 'neutral', variant: 'subtle' }, () => osiApproved ? 'Yes' : 'No')
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: () => h(UButton, { variant: 'outline', size: 'xs', label: 'Edit' })
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

useHead({ title: 'License Administration - Polaris' })
</script>
