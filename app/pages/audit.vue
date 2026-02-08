<template>
  <div class="space-y-6">
    <UPageHeader
      title="Audit Log"
      description="Track changes across the system"
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
        <div class="flex flex-wrap gap-4">
          <div class="flex-1 min-w-50">
            <UFormField label="Entity Type">
              <USelect
                v-model="selectedEntityType"
                :items="entityTypeItems"
                placeholder="All Types"
                class="w-full"
                @update:model-value="applyFilters"
              />
            </UFormField>
          </div>
          <div class="flex-1 min-w-50">
            <UFormField label="Operation">
              <USelect
                v-model="selectedOperation"
                :items="operationItems"
                placeholder="All Operations"
                class="w-full"
                @update:model-value="applyFilters"
              />
            </UFormField>
          </div>
          <div class="flex items-end">
            <UButton
              label="Clear Filters"
              variant="outline"
              @click="clearFilters"
            />
          </div>
        </div>
      </UCard>

      <UCard v-if="data">
        <div class="text-center">
          <p class="text-sm text-(--ui-text-muted)">Total Entries</p>
          <p class="text-3xl font-bold mt-2">{{ data.count }}</p>
        </div>
      </UCard>

      <UCard>
        <UTable
          :data="entries"
          :columns="columns"
          :loading="pending"
          class="flex-1"
        >
          <template #empty>
            <div class="text-center text-(--ui-text-muted) py-12">
              No audit log entries found matching your filters.
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

function getOperationColor(operation: string): 'success' | 'warning' | 'error' | 'neutral' {
  const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    CREATE: 'success',
    UPDATE: 'warning',
    DELETE: 'error',
    DENY_LICENSE: 'error',
    ALLOW_LICENSE: 'success'
  }
  return colors[operation] || 'neutral'
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
      return h(resolveComponent('UBadge'), {
        color: getOperationColor(operation),
        variant: 'subtle'
      }, () => operation)
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

const selectedEntityType = ref('')
const selectedOperation = ref('')
const page = ref(1)
const pageSize = 20

const queryParams = computed(() => {
  const params: Record<string, string | number> = {
    limit: pageSize,
    offset: (page.value - 1) * pageSize
  }
  if (selectedEntityType.value) params.entityType = selectedEntityType.value
  if (selectedOperation.value) params.operation = selectedOperation.value
  return params
})

const { data, pending, error, refresh } = await useFetch<AuditResponse>('/api/audit-logs', {
  query: queryParams
})

const entries = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

const entityTypeItems = computed(() => {
  const types = data.value?.filters.entityTypes || []
  return [{ label: 'All Types', value: '' }, ...types.map(t => ({ label: t, value: t }))]
})

const operationItems = computed(() => {
  const ops = data.value?.filters.operations || []
  return [{ label: 'All Operations', value: '' }, ...ops.map(o => ({ label: o, value: o }))]
})

function applyFilters() {
  page.value = 1
  refresh()
}

function clearFilters() {
  selectedEntityType.value = ''
  selectedOperation.value = ''
  page.value = 1
  refresh()
}

useHead({ title: 'Audit Log - Polaris' })
</script>
