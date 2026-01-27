<template>
  <NuxtLayout name="default">
    <div class="space-y">
      <div>
        <h1>Audit Log</h1>
        <p class="text-muted" style="margin-top: 0.5rem;">Track changes across the system</p>
      </div>

      <UiCard v-if="pending">
        <div class="text-center" style="padding: 3rem;">
          <div class="spinner" style="margin: 0 auto;"/>
          <p class="text-muted" style="margin-top: 1rem;">Loading audit logs...</p>
        </div>
      </UiCard>

      <UiCard v-else-if="error">
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

      <template v-else-if="data">
        <!-- Filters -->
        <UiCard>
          <div class="flex" style="flex-wrap: wrap; gap: 1rem;">
            <div style="flex: 1; min-width: 200px;">
              <label>Entity Type</label>
              <select v-model="selectedEntityType" @change="applyFilters">
                <option value="">All Types</option>
                <option v-for="type in data.filters.entityTypes" :key="type" :value="type">{{ type }}</option>
              </select>
            </div>
            <div style="flex: 1; min-width: 200px;">
              <label>Operation</label>
              <select v-model="selectedOperation" @change="applyFilters">
                <option value="">All Operations</option>
                <option v-for="op in data.filters.operations" :key="op" :value="op">{{ op }}</option>
              </select>
            </div>
            <div style="display: flex; align-items: flex-end;">
              <button class="btn btn-secondary" @click="clearFilters">Clear Filters</button>
            </div>
          </div>
        </UiCard>

        <!-- Summary -->
        <UiCard>
          <div class="text-center">
            <p class="text-sm text-muted">Total Entries</p>
            <p class="text-3xl font-bold" style="margin-top: 0.5rem;">{{ data.count }}</p>
          </div>
        </UiCard>

        <!-- Audit Log Entries -->
        <UiCard v-if="data.data.length === 0">
          <div class="text-center text-muted" style="padding: 2rem;">
            No audit log entries found matching your filters.
          </div>
        </UiCard>

        <div v-else class="space-y">
          <UiCard v-for="entry in data.data" :key="entry.id">
            <div class="flex justify-between items-center">
              <div>
                <div class="flex items-center" style="gap: 0.5rem;">
                  <UiBadge :variant="getOperationVariant(entry.operation)">{{ entry.operation }}</UiBadge>
                  <span class="font-medium">{{ entry.entityType }}</span>
                  <span class="text-muted">{{ entry.entityName }}</span>
                </div>
                <p class="text-sm text-muted" style="margin-top: 0.5rem;">
                  by {{ entry.performedBy }} at {{ formatDate(entry.timestamp) }}
                </p>
              </div>
            </div>
          </UiCard>
        </div>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
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
  filters: {
    entityTypes: string[]
    operations: string[]
  }
}

const selectedEntityType = ref('')
const selectedOperation = ref('')

const queryParams = computed(() => {
  const params: Record<string, string> = {}
  if (selectedEntityType.value) params.entityType = selectedEntityType.value
  if (selectedOperation.value) params.operation = selectedOperation.value
  return params
})

const { data, pending, error, refresh } = await useFetch<AuditResponse>('/api/audit-logs', {
  query: queryParams
})

function getOperationVariant(operation: string) {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    CREATE: 'success',
    UPDATE: 'warning',
    DELETE: 'error'
  }
  return variants[operation] || 'neutral'
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

function applyFilters() {
  refresh()
}

function clearFilters() {
  selectedEntityType.value = ''
  selectedOperation.value = ''
  refresh()
}

useHead({ title: 'Audit Log - Polaris' })
</script>
