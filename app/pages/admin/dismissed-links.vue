<template>
  <div class="space-y-6">
    <UPageHeader
      title="Dismissed Components"
      :description="`${total} component${total === 1 ? '' : 's'} dismissed from the link queue`"
    />

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      description="These components were intentionally excluded from the Component Link Queue. Restoring one puts it back in the queue so it can be linked to (or used to create) a Technology."
    />

    <UAlert
      v-if="fetchError"
      color="error"
      :title="fetchError.message || 'Failed to load dismissed components'"
      icon="i-lucide-circle-x"
    />

    <UAlert
      v-if="restoreError"
      color="error"
      title="Failed to restore component"
      :description="restoreError"
      icon="i-lucide-circle-x"
      close
      @close="restoreError = ''"
    />

    <PaginatedTable
      v-else
      v-model:page="page"
      :data="dismissed"
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
          No dismissed components.
        </div>
      </template>
    </PaginatedTable>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse } from '~~/types/api'

interface DismissedComponent {
  name: string
  group: string | null
  packageManager: string | null
  description: string | null
  purl: string | null
  dismissedAt: string
}

const UButton = resolveComponent('UButton')
const UTooltip = resolveComponent('UTooltip')
const UIcon = resolveComponent('UIcon')

const { searchInput, debouncedSearch } = useTableSearch()

const { page, pageSize, offset } = usePaginatedSorting({ pageSize: 50, resetOn: [debouncedSearch] })

const { data, pending, error: fetchError, refresh } = await useFetch<ApiResponse<DismissedComponent>>(
  '/api/components/dismissed-links',
  { query: { skip: offset, limit: pageSize, search: debouncedSearch } }
)

const dismissed = useApiData(data)
const total = useApiCount(data)

const columns: TableColumn<DismissedComponent>[] = [
  {
    accessorKey: 'name',
    header: 'Component',
    cell: ({ row }) => {
      const { name, group, description, purl } = row.original
      const displayName = group ? `${group}/${name}` : name
      const nameEl = description
        ? h(UTooltip, { text: description }, () => h('span', { class: 'inline-flex items-center gap-1.5 font-medium' }, [
            displayName,
            h(UIcon, { name: 'i-lucide-info', class: 'size-3.5 text-(--ui-text-muted)' })
          ]))
        : h('span', { class: 'font-medium' }, displayName)
      return h('div', {}, [
        nameEl,
        purl ? h('div', { class: 'text-xs text-(--ui-text-muted) font-mono truncate' }, purl) : null
      ])
    }
  },
  {
    accessorKey: 'packageManager',
    header: 'Ecosystem',
    cell: ({ row }) => row.getValue('packageManager') ?? '—'
  },
  {
    accessorKey: 'dismissedAt',
    header: 'Dismissed',
    cell: ({ row }) => new Date(row.original.dismissedAt).toLocaleString()
  },
  {
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
    cell: ({ row }) => h(UTooltip, { text: 'Restore to link queue' }, () =>
      h(UButton, {
        size: 'xs',
        icon: 'i-lucide-undo-2',
        label: 'Restore',
        color: 'neutral',
        variant: 'outline',
        onClick: () => restoreItem(row.original)
      })
    )
  }
]

const restoreError = ref('')

async function restoreItem(item: DismissedComponent) {
  restoreError.value = ''
  try {
    await $fetch('/api/components/undismiss-link', {
      method: 'POST',
      body: {
        componentName: item.name,
        componentGroup: item.group,
        componentPackageManager: item.packageManager
      }
    })
    await refresh()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    restoreError.value = (err as { data?: { message?: string } })?.data?.message ?? msg
  }
}

useHead({ title: 'Dismissed Components - Polaris' })
</script>
