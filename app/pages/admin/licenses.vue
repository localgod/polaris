<template>
  
    <div class="space-y">
      <div class="page-header">
        <h1>License Administration</h1>
        <p>Manage license definitions and policies</p>
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

      <UiCard v-else>
        <UTable
          :data="licenses"
          :columns="columns"
          :loading="pending"
          class="flex-1"
        >
          <template #empty>
            <div class="text-center text-muted" style="padding: 3rem;">
              No licenses found.
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

const UiBadge = resolveComponent('UiBadge')

function getCategoryVariant(category: string) {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    permissive: 'success',
    copyleft: 'warning',
    proprietary: 'error'
  }
  return variants[category] || 'neutral'
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
      return h(UiBadge, { variant: getCategoryVariant(category) }, () => category)
    }
  },
  {
    accessorKey: 'osiApproved',
    header: 'OSI Approved',
    cell: ({ row }) => {
      const osiApproved = row.getValue('osiApproved') as boolean
      return h(UiBadge, { variant: osiApproved ? 'success' : 'neutral' }, () => osiApproved ? 'Yes' : 'No')
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: () => h('button', { class: 'btn btn-secondary', style: 'padding: 0.25rem 0.5rem; font-size: 0.75rem;' }, 'Edit')
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
