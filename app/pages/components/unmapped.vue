<template>
  <div class="space-y-6">
    <UPageHeader
      title="Unmapped Components"
      description="Components not yet mapped to approved technologies"
      :links="[{ label: 'Back to Components', to: '/components', icon: 'i-lucide-arrow-left', variant: 'outline' as const }]"
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
      <UCard v-if="data">
        <div class="text-center">
          <p class="text-sm text-(--ui-text-muted)">Unmapped Components</p>
          <p class="text-3xl font-bold text-(--ui-color-warning-500) mt-2">{{ data.count }}</p>
        </div>
      </UCard>

      <UCard>
        <UTable
          v-model:sorting="sorting"
          :manual-sorting="true"
          :data="components"
          :columns="columns"
          :loading="pending"
          class="flex-1"
        >
          <template #empty>
            <div class="text-center py-8">
              <UIcon name="i-lucide-check-circle" class="text-5xl text-(--ui-color-success-500)" />
              <h3 class="mt-4">All Components Mapped!</h3>
              <p class="text-(--ui-text-muted) mt-2">Every component is mapped to an approved technology.</p>
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
    header: ({ column }) => getSortableHeader(column, 'Name'),
    cell: ({ row }) => h('strong', {}, row.getValue('name') as string)
  },
  {
    accessorKey: 'version',
    header: ({ column }) => getSortableHeader(column, 'Version'),
    cell: ({ row }) => h('code', {}, row.getValue('version') as string)
  },
  {
    accessorKey: 'packageManager',
    header: ({ column }) => getSortableHeader(column, 'Package Manager')
  },
  {
    accessorKey: 'system',
    header: ({ column }) => getSortableHeader(column, 'System'),
    cell: ({ row }) => row.getValue('system') || '—'
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

const { data, pending, error } = await useFetch<UnmappedResponse>('/api/components/unmapped', {
  query: queryParams
})

const components = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

useHead({ title: 'Unmapped Components - Polaris' })
</script>
