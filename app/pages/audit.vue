<template>
  <NuxtLayout name="default">
    <div class="space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Track changes across the system</p>
      </div>

      <UiCard v-if="pending">
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"/>
          <p class="mt-4 text-gray-600 dark:text-gray-300">Loading audit logs...</p>
        </div>
      </UiCard>

      <UiCard v-else-if="error">
        <div class="flex items-center gap-4 text-error-600 dark:text-error-400">
          <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 class="text-lg font-semibold">Error</h3>
            <p class="text-sm">{{ error.message }}</p>
          </div>
        </div>
      </UiCard>

      <template v-else-if="data">
        <!-- Filters -->
        <UiCard>
          <div class="flex flex-wrap gap-4">
            <div class="flex-1 min-w-[200px]">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entity Type</label>
              <select
                v-model="selectedEntityType"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                @change="applyFilters"
              >
                <option value="">All Types</option>
                <option v-for="type in data.filters.entityTypes" :key="type" :value="type">
                  {{ type }}
                </option>
              </select>
            </div>
            <div class="flex-1 min-w-[200px]">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Operation</label>
              <select
                v-model="selectedOperation"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                @change="applyFilters"
              >
                <option value="">All Operations</option>
                <option v-for="op in data.filters.operations" :key="op" :value="op">
                  {{ op }}
                </option>
              </select>
            </div>
            <div class="flex items-end">
              <button
                class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                @click="clearFilters"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </UiCard>

        <!-- Summary -->
        <UiCard>
          <div class="text-center">
            <p class="text-sm font-medium text-gray-600 dark:text-gray-300">Total Entries</p>
            <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{{ data.count }}</p>
          </div>
        </UiCard>

        <!-- Audit Log Entries -->
        <div v-if="data.data.length === 0">
          <UiCard>
            <div class="text-center py-8 text-gray-500 dark:text-gray-400">
              <svg class="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No audit log entries found</p>
            </div>
          </UiCard>
        </div>

        <div v-else class="space-y-4">
          <UiCard v-for="entry in data.data" :key="entry.id">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <UiBadge :variant="getOperationVariant(entry.operation)" size="sm">
                    {{ entry.operation }}
                  </UiBadge>
                  <UiBadge variant="neutral" size="sm">
                    {{ entry.entityType }}
                  </UiBadge>
                  <span class="text-sm text-gray-500 dark:text-gray-400">
                    {{ formatTimestamp(entry.timestamp) }}
                  </span>
                </div>
                <h3 class="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {{ entry.entityLabel || entry.entityId }}
                </h3>
                <div v-if="entry.previousStatus || entry.newStatus" class="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  <span v-if="entry.previousStatus" class="inline-flex items-center">
                    <span class="text-gray-500">From:</span>
                    <UiBadge variant="neutral" size="sm" class="ml-1">{{ entry.previousStatus }}</UiBadge>
                  </span>
                  <span v-if="entry.previousStatus && entry.newStatus" class="mx-2">→</span>
                  <span v-if="entry.newStatus" class="inline-flex items-center">
                    <span class="text-gray-500">To:</span>
                    <UiBadge :variant="entry.newStatus === 'active' ? 'success' : 'neutral'" size="sm" class="ml-1">{{ entry.newStatus }}</UiBadge>
                  </span>
                </div>
                <p v-if="entry.reason" class="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  <span class="font-medium">Reason:</span> {{ entry.reason }}
                </p>
              </div>
              <div class="text-right text-sm text-gray-500 dark:text-gray-400">
                <p v-if="entry.source">Source: {{ entry.source }}</p>
                <p v-if="entry.userId">User: {{ entry.userId }}</p>
              </div>
            </div>
          </UiCard>
        </div>

        <!-- Pagination -->
        <div v-if="data.count > pageSize" class="flex justify-center gap-2">
          <button
            :disabled="currentPage === 1"
            class="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            @click="goToPage(currentPage - 1)"
          >
            Previous
          </button>
          <span class="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
            Page {{ currentPage }} of {{ totalPages }}
          </span>
          <button
            :disabled="currentPage >= totalPages"
            class="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            @click="goToPage(currentPage + 1)"
          >
            Next
          </button>
        </div>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
interface AuditLog {
  id: string
  timestamp: string
  operation: string
  entityType: string
  entityId: string
  entityLabel: string | null
  previousStatus: string | null
  newStatus: string | null
  changedFields: string[]
  reason: string | null
  source: string
  userId: string | null
}

interface AuditLogResponse {
  success: boolean
  data: AuditLog[]
  count: number
  filters: {
    entityTypes: string[]
    operations: string[]
  }
}

const pageSize = 50
const currentPage = ref(1)
const selectedEntityType = ref('')
const selectedOperation = ref('')

const queryParams = computed(() => ({
  limit: pageSize,
  offset: (currentPage.value - 1) * pageSize,
  entityType: selectedEntityType.value || undefined,
  operation: selectedOperation.value || undefined
}))

const { data, pending, error, refresh } = await useFetch<AuditLogResponse>('/api/audit-logs', {
  query: queryParams
})

const totalPages = computed(() => {
  if (!data.value) return 1
  return Math.ceil(data.value.count / pageSize)
})

function getOperationVariant(operation: string): 'success' | 'error' | 'warning' | 'neutral' {
  const variants: Record<string, 'success' | 'error' | 'warning' | 'neutral'> = {
    CREATE: 'success',
    ACTIVATE: 'success',
    DELETE: 'error',
    DEACTIVATE: 'warning',
    ARCHIVE: 'warning',
    UPDATE: 'neutral'
  }
  return variants[operation] || 'neutral'
}

function formatTimestamp(timestamp: string): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString()
}

function applyFilters() {
  currentPage.value = 1
  refresh()
}

function clearFilters() {
  selectedEntityType.value = ''
  selectedOperation.value = ''
  currentPage.value = 1
  refresh()
}

function goToPage(page: number) {
  currentPage.value = page
  refresh()
}

useHead({ title: 'Audit Log - Polaris' })
</script>
