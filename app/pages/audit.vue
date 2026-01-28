<template>
  
    <div class="space-y">
      <div class="page-header">
        <h1>Audit Log</h1>
        <p>Track changes across the system</p>
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
        <!-- Audit Log Table -->
        <UiCard>
          <UTable
            :data="entries"
            :columns="columns"
            :loading="pending"
            class="flex-1"
          >
            <template #empty>
              <div class="text-center text-muted" style="padding: 3rem;">
                No audit log entries found.
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

interface AuditEntry {
  id: string
  entityType: string
  entityName: string
  operation: string
  performedBy: string
  timestamp: string
}

interface AuditResponse {
  success: boolean
  data: AuditEntry[]
  count: number
  total?: number
  filters: {
    entityTypes: string[]
    operations: string[]
  }
}

const UiBadge = resolveComponent('UiBadge')

function getOperationVariant(operation: string) {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    CREATE: 'success',
    UPDATE: 'warning',
    DELETE: 'error',
    DENY_LICENSE: 'error',
    ALLOW_LICENSE: 'success'
  }
  return variants[operation] || 'neutral'
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

const columns: TableColumn<AuditEntry>[] = [
  {
    accessorKey: 'operation',
    header: 'Operation',
    cell: ({ row }) => {
      const operation = row.getValue('operation') as string
      return h(UiBadge, { variant: getOperationVariant(operation) }, () => operation)
    }
  },
  {
    accessorKey: 'entityType',
    header: 'Entity Type',
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.getValue('entityType') as string)
  },
  {
    accessorKey: 'entityName',
    header: 'Entity',
    cell: ({ row }) => row.getValue('entityName') as string
  },
  {
    accessorKey: 'performedBy',
    header: 'Performed By'
  },
  {
    accessorKey: 'timestamp',
    header: 'Timestamp',
    cell: ({ row }) => formatDate(row.getValue('timestamp') as string)
  }
]

const page = ref(1)
const pageSize = 20

const queryParams = computed(() => ({
  limit: pageSize,
  offset: (page.value - 1) * pageSize
}))

const { data, pending, error } = await useFetch<AuditResponse>('/api/audit-logs', {
  query: queryParams
})

const entries = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

useHead({ title: 'Audit Log - Polaris' })
</script>
