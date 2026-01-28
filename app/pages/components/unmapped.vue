<template>
  
    <div class="space-y">
      <div class="page-header">
        <NuxtLink to="/components" style="display: inline-block; margin-bottom: 0.5rem;">← Back to Components</NuxtLink>
        <h1>Unmapped Components</h1>
        <p>Components not yet mapped to approved technologies</p>
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

      <template v-else>
        <UiCard v-if="data">
          <div class="text-center">
            <p class="text-sm text-muted">Unmapped Components</p>
            <p class="text-3xl font-bold text-warning" style="margin-top: 0.5rem;">{{ data.count }}</p>
          </div>
        </UiCard>

        <UiCard>
          <UTable
            :data="components"
            :columns="columns"
            :loading="pending"
            class="flex-1"
          >
            <template #empty>
              <div class="text-center" style="padding: 2rem;">
                <svg style="margin: 0 auto; width: 3rem; height: 3rem; color: var(--color-success);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 style="margin-top: 1rem;">All Components Mapped!</h3>
                <p class="text-muted" style="margin-top: 0.5rem;">Every component is mapped to an approved technology.</p>
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

interface UnmappedComponent {
  name: string
  version: string
  packageManager: string
  system: string
}

interface UnmappedResponse {
  success: boolean
  data: UnmappedComponent[]
  count: number
  total?: number
}

const columns: TableColumn<UnmappedComponent>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => h('strong', {}, row.getValue('name') as string)
  },
  {
    accessorKey: 'version',
    header: 'Version',
    cell: ({ row }) => h('code', {}, row.getValue('version') as string)
  },
  {
    accessorKey: 'packageManager',
    header: 'Package Manager'
  },
  {
    accessorKey: 'system',
    header: 'System',
    cell: ({ row }) => row.getValue('system') || '—'
  }
]

const page = ref(1)
const pageSize = 20

const queryParams = computed(() => ({
  limit: pageSize,
  offset: (page.value - 1) * pageSize
}))

const { data, pending, error } = await useFetch<UnmappedResponse>('/api/components/unmapped', {
  query: queryParams
})

const components = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

useHead({ title: 'Unmapped Components - Polaris' })
</script>
