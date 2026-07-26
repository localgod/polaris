<template>
  <div class="space-y-6">
    <UPageHeader
      title="Background Jobs"
      description="GitHub owner imports and health-refresh jobs, live and historical"
    />

    <UTabs :items="tabItems">
      <template #github>
        <div class="space-y-6 mt-4">
          <UAlert
            color="info"
            variant="subtle"
            icon="i-lucide-info"
            description="Jobs run in the same process that started them. If that process crashed or restarted mid-import, a job can be stuck showing 'running' forever — cancel it here to clear it from view, then delete it once finished."
          />

          <UAlert
            v-if="githubFetchError"
            color="error"
            :title="githubFetchError.message || 'Failed to load import jobs'"
            icon="i-lucide-circle-x"
          />

          <UAlert
            v-if="cancelError"
            color="error"
            title="Failed to cancel job"
            :description="cancelError"
            icon="i-lucide-circle-x"
            close
            @close="cancelError = ''"
          />

          <PaginatedTable
            v-else
            v-model:page="githubPage"
            :data="githubJobs"
            :columns="githubColumns"
            :loading="githubPending"
            :total="githubTotal"
            :page-size="githubPageSize"
          >
            <template #header>
              <TableSearchHeader v-model="githubSearchInput">
                <template #filters>
                  <USelect v-model="githubStatusFilter" :items="statusItems" class="w-40" />
                  <UButton
                    label="Refresh"
                    icon="i-lucide-refresh-cw"
                    size="sm"
                    color="neutral"
                    variant="outline"
                    :loading="githubPending"
                    @click="githubRefresh()"
                  />
                </template>
              </TableSearchHeader>
            </template>
            <template #empty>
              <div class="text-center text-(--ui-text-muted) py-12">
                No import jobs match these filters.
              </div>
            </template>
          </PaginatedTable>
        </div>
      </template>

      <template #health>
        <div class="space-y-6 mt-4">
          <UAlert
            color="info"
            variant="subtle"
            icon="i-lucide-info"
            description="Health-refresh jobs run automatically via a scheduled background task that reconciles component EOL, vulnerability, and maintenance data. If that task crashed or restarted mid-run, a job can be stuck showing 'running' forever — cancel it here to clear it from view, then delete it once finished."
          />

          <UAlert
            v-if="healthFetchError"
            color="error"
            :title="healthFetchError.message || 'Failed to load health-refresh jobs'"
            icon="i-lucide-circle-x"
          />

          <UAlert
            v-if="healthCancelError"
            color="error"
            title="Failed to cancel job"
            :description="healthCancelError"
            icon="i-lucide-circle-x"
            close
            @close="healthCancelError = ''"
          />

          <PaginatedTable
            v-else
            v-model:page="healthPage"
            :data="healthJobs"
            :columns="healthColumns"
            :loading="healthPending"
            :total="healthTotal"
            :page-size="healthPageSize"
          >
            <template #header>
              <TableSearchHeader v-model="healthSearchInput">
                <template #filters>
                  <USelect v-model="healthStatusFilter" :items="statusItems" class="w-40" />
                  <UButton
                    label="Refresh"
                    icon="i-lucide-refresh-cw"
                    size="sm"
                    color="neutral"
                    variant="outline"
                    :loading="healthPending"
                    @click="healthRefresh()"
                  />
                </template>
              </TableSearchHeader>
            </template>
            <template #empty>
              <div class="text-center text-(--ui-text-muted) py-12">
                No health-refresh jobs match these filters.
              </div>
            </template>
          </PaginatedTable>
        </div>
      </template>
    </UTabs>

    <!-- GitHub import job detail modal -->
    <UModal v-model:open="detailModalOpen" :ui="{ footer: 'justify-end' }">
      <template #header>
        <h3 class="text-lg font-semibold">{{ detailJob?.organization || 'Import Job' }}</h3>
      </template>
      <template #body>
        <USkeleton v-if="detailLoading" class="h-64 w-full" />
        <UAlert
          v-else-if="detailError"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-circle"
          :description="detailError"
        />
        <div v-else-if="detailJob" class="space-y-4">
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span class="text-(--ui-text-muted)">Status</span>
              <div><UBadge :color="jobStatusColor(detailJob.status)" variant="subtle">{{ detailJob.status }}</UBadge></div>
            </div>
            <div>
              <span class="text-(--ui-text-muted)">Progress</span>
              <div>{{ detailJob.completed }}/{{ detailJob.total }} · {{ detailJob.failed }} failed · {{ detailJob.skipped }} skipped</div>
            </div>
            <div>
              <span class="text-(--ui-text-muted)">Created</span>
              <div>{{ new Date(detailJob.createdAt).toLocaleString() }}</div>
            </div>
            <div>
              <span class="text-(--ui-text-muted)">Started</span>
              <div>{{ detailJob.startedAt ? new Date(detailJob.startedAt).toLocaleString() : '—' }}</div>
            </div>
            <div>
              <span class="text-(--ui-text-muted)">Finished</span>
              <div>{{ detailJob.finishedAt ? new Date(detailJob.finishedAt).toLocaleString() : '—' }}</div>
            </div>
            <div>
              <span class="text-(--ui-text-muted)">Requested by</span>
              <div class="font-mono text-xs truncate">{{ detailJob.requestedBy }}</div>
            </div>
          </div>

          <UAlert
            v-if="detailJob.error"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-circle"
            :title="detailJob.error"
          />

          <div class="max-h-72 overflow-auto divide-y divide-(--ui-border) rounded-md border border-(--ui-border)">
            <div v-if="detailJob.items.length === 0" class="p-3 text-sm text-(--ui-text-muted)">
              No repositories recorded for this job.
            </div>
            <div
              v-for="item in detailJob.items"
              :key="item.id"
              class="flex items-center justify-between gap-3 px-3 py-2"
            >
              <div class="min-w-0">
                <div class="truncate text-sm font-medium">{{ item.repositoryFullName }}</div>
                <div v-if="item.message" class="truncate text-xs text-(--ui-text-muted)">{{ item.message }}</div>
              </div>
              <UBadge :color="itemStatusColor(item.status)" variant="subtle">{{ item.status }}</UBadge>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <UButton
          v-if="detailJob && (detailJob.status === 'queued' || detailJob.status === 'running')"
          label="Cancel Job"
          color="error"
          variant="outline"
          :loading="cancellingId === detailJob.id"
          @click="cancelJob(detailJob.id)"
        />
        <UButton
          v-if="detailJob && detailJob.status !== 'queued' && detailJob.status !== 'running'"
          label="Delete"
          color="error"
          variant="outline"
          @click="openDeleteModal(detailJob)"
        />
        <UButton label="Close" color="neutral" variant="outline" @click="detailModalOpen = false" />
      </template>
    </UModal>

    <!-- Health-refresh job detail modal -->
    <UModal v-model:open="healthDetailModalOpen" :ui="{ footer: 'justify-end' }">
      <template #header>
        <h3 class="text-lg font-semibold">{{ healthDetailJob?.systemName || 'Scheduled Health Refresh' }}</h3>
      </template>
      <template #body>
        <USkeleton v-if="healthDetailLoading" class="h-64 w-full" />
        <UAlert
          v-else-if="healthDetailError"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-circle"
          :description="healthDetailError"
        />
        <div v-else-if="healthDetailJob" class="space-y-4">
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span class="text-(--ui-text-muted)">Status</span>
              <div><UBadge :color="jobStatusColor(healthDetailJob.status)" variant="subtle">{{ healthDetailJob.status }}</UBadge></div>
            </div>
            <div>
              <span class="text-(--ui-text-muted)">Trigger</span>
              <div>{{ healthDetailJob.trigger }}</div>
            </div>
            <div>
              <span class="text-(--ui-text-muted)">Progress</span>
              <div>{{ healthDetailJob.completedItems }}/{{ healthDetailJob.totalItems }} · {{ healthDetailJob.failedItems }} failed</div>
            </div>
            <div>
              <span class="text-(--ui-text-muted)">Created</span>
              <div>{{ new Date(healthDetailJob.createdAt).toLocaleString() }}</div>
            </div>
            <div>
              <span class="text-(--ui-text-muted)">Started</span>
              <div>{{ healthDetailJob.startedAt ? new Date(healthDetailJob.startedAt).toLocaleString() : '—' }}</div>
            </div>
            <div>
              <span class="text-(--ui-text-muted)">Finished</span>
              <div>{{ healthDetailJob.finishedAt ? new Date(healthDetailJob.finishedAt).toLocaleString() : '—' }}</div>
            </div>
          </div>

          <UAlert
            v-if="healthDetailJob.error"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-circle"
            :title="healthDetailJob.error"
          />

          <div class="max-h-72 overflow-auto divide-y divide-(--ui-border) rounded-md border border-(--ui-border)">
            <div v-if="healthDetailJob.items.length === 0" class="p-3 text-sm text-(--ui-text-muted)">
              No components recorded for this job.
            </div>
            <div
              v-for="item in healthDetailJob.items"
              :key="item.id"
              class="flex items-center justify-between gap-3 px-3 py-2"
            >
              <div class="min-w-0">
                <div class="truncate text-sm font-medium">{{ item.componentName }}@{{ item.componentVersion }}</div>
                <div v-if="item.errorSummary" class="truncate text-xs text-(--ui-text-muted)">{{ item.errorSummary }}</div>
              </div>
              <UBadge :color="healthItemStatusColor(item.status)" variant="subtle">{{ item.status }}</UBadge>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <UButton
          v-if="healthDetailJob && (healthDetailJob.status === 'queued' || healthDetailJob.status === 'running')"
          label="Cancel Job"
          color="error"
          variant="outline"
          :loading="healthCancellingId === healthDetailJob.id"
          @click="cancelHealthJob(healthDetailJob.id)"
        />
        <UButton
          v-if="healthDetailJob && healthDetailJob.status !== 'queued' && healthDetailJob.status !== 'running'"
          label="Delete"
          color="error"
          variant="outline"
          @click="openHealthDeleteModal(healthDetailJob)"
        />
        <UButton label="Close" color="neutral" variant="outline" @click="healthDetailModalOpen = false" />
      </template>
    </UModal>

    <!-- Health-refresh delete confirmation modal -->
    <UModal v-model:open="healthDeleteModalOpen" :ui="{ footer: 'justify-end' }">
      <template #header>
        <h3 class="text-lg font-semibold">Delete Health-Refresh Job</h3>
      </template>
      <template #body>
        <p class="text-sm">
          Are you sure you want to delete this health-refresh job for
          <strong>{{ healthDeleteTarget?.systemName || 'all systems' }}</strong>?
        </p>
        <p class="text-sm text-(--ui-text-muted) mt-2">
          This permanently removes the job's run history and its per-component check results.
          Component health data itself is not affected. This cannot be undone.
        </p>
        <UAlert
          v-if="healthDeleteError"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-circle"
          :description="healthDeleteError"
          class="mt-4"
        />
      </template>
      <template #footer>
        <UButton label="Cancel" color="neutral" variant="outline" @click="healthDeleteModalOpen = false" />
        <UButton label="Delete" color="error" :loading="healthDeleteLoading" @click="confirmHealthDelete" />
      </template>
    </UModal>

    <!-- Delete confirmation modal -->
    <UModal v-model:open="deleteModalOpen" :ui="{ footer: 'justify-end' }">
      <template #header>
        <h3 class="text-lg font-semibold">Delete Import Job</h3>
      </template>
      <template #body>
        <p class="text-sm">
          Are you sure you want to delete the import job for <strong>{{ deleteTarget?.organization }}</strong>?
        </p>
        <p class="text-sm text-(--ui-text-muted) mt-2">
          This permanently removes the job's run history and its per-repository results.
          Any systems or components already imported are not affected. This cannot be undone.
        </p>
        <UAlert
          v-if="deleteError"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-circle"
          :description="deleteError"
          class="mt-4"
        />
      </template>
      <template #footer>
        <UButton label="Cancel" color="neutral" variant="outline" @click="deleteModalOpen = false" />
        <UButton label="Delete" color="error" :loading="deleteLoading" @click="confirmDelete" />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse } from '~~/types/api'

type ImportJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
type ImportJobItemStatus = 'pending' | 'running' | 'imported' | 'skipped' | 'failed'
type HealthRefreshJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
type HealthRefreshJobItemStatus = 'pending' | 'running' | 'refreshed' | 'failed' | 'skipped'

interface ImportJobSummary {
  id: string
  status: ImportJobStatus
  organization: string
  requestedBy: string
  total: number
  completed: number
  failed: number
  skipped: number
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  error: string | null
}

interface ImportJobItemDetail {
  id: string
  repositoryFullName: string
  repositoryUrl: string
  status: ImportJobItemStatus
  message: string | null
}

interface ImportJobDetail extends ImportJobSummary {
  items: ImportJobItemDetail[]
}

interface HealthRefreshJobSummary {
  id: string
  status: HealthRefreshJobStatus
  trigger: 'sbom_import' | 'scheduled' | 'manual'
  systemName: string | null
  totalItems: number
  completedItems: number
  failedItems: number
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
  error: string | null
}

interface HealthRefreshJobItemDetail {
  id: string
  componentName: string
  componentVersion: string
  status: HealthRefreshJobItemStatus
  errorSummary: string | null
}

interface HealthRefreshJobDetail extends HealthRefreshJobSummary {
  items: HealthRefreshJobItemDetail[]
}

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')

const statusItems = [
  { label: 'All statuses', value: 'all' },
  { label: 'Running', value: 'running' },
  { label: 'Queued', value: 'queued' },
  { label: 'Failed', value: 'failed' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' }
]

function jobStatusColor(status: ImportJobStatus | HealthRefreshJobStatus): 'success' | 'error' | 'warning' | 'info' | 'neutral' {
  if (status === 'completed') return 'success'
  if (status === 'failed' || status === 'cancelled') return 'error'
  if (status === 'running') return 'info'
  return 'neutral'
}

function ageLabel(dateString: string | null): string {
  if (!dateString) return '—'
  const ms = Date.now() - new Date(dateString).getTime()
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m ago`
  return `${Math.floor(hours / 24)}d ago`
}

// --- GitHub import jobs ---

const { searchInput: githubSearchInput, debouncedSearch: githubDebouncedSearch } = useTableSearch()
const githubStatusFilter = ref('all')
const githubStatusQueryParam = computed(() => githubStatusFilter.value === 'all' ? '' : githubStatusFilter.value)

const { page: githubPage, pageSize: githubPageSize, offset: githubOffset } = usePaginatedSorting({
  pageSize: 25,
  resetOn: [githubDebouncedSearch, githubStatusFilter]
})

const { data: githubData, pending: githubPending, error: githubFetchError, refresh: githubRefresh } = await useFetch<ApiResponse<ImportJobSummary>>(
  '/api/admin/import/jobs',
  { query: { skip: githubOffset, limit: githubPageSize, search: githubDebouncedSearch, status: githubStatusQueryParam } }
)

const githubJobs = useApiData(githubData)
const githubTotal = useApiCount(githubData)

function itemStatusColor(status: ImportJobItemStatus): 'success' | 'error' | 'warning' | 'info' | 'neutral' {
  if (status === 'imported') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'skipped') return 'warning'
  if (status === 'running') return 'info'
  return 'neutral'
}

const cancelError = ref('')
const cancellingId = ref('')

async function cancelJob(id: string) {
  cancelError.value = ''
  cancellingId.value = id
  try {
    const res = await $fetch<{ success: boolean; data: ImportJobDetail }>(
      `/api/admin/import/jobs/${encodeURIComponent(id)}/cancel`,
      { method: 'POST' }
    )
    if (detailJob.value?.id === id) {
      detailJob.value = res.data
    }
    await githubRefresh()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to cancel job'
    cancelError.value = (err as { data?: { message?: string } })?.data?.message ?? msg
  } finally {
    cancellingId.value = ''
  }
}

const detailModalOpen = ref(false)
const detailJob = ref<ImportJobDetail | null>(null)
const detailLoading = ref(false)
const detailError = ref('')

async function openDetail(id: string) {
  detailModalOpen.value = true
  detailLoading.value = true
  detailError.value = ''
  detailJob.value = null
  try {
    const res = await $fetch<{ success: boolean; data: ImportJobDetail }>(`/api/admin/import/jobs/${encodeURIComponent(id)}`)
    detailJob.value = res.data
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load job details'
    detailError.value = (err as { data?: { message?: string } })?.data?.message ?? msg
  } finally {
    detailLoading.value = false
  }
}

const deleteModalOpen = ref(false)
const deleteTarget = ref<ImportJobSummary | null>(null)
const deleteLoading = ref(false)
const deleteError = ref('')

function openDeleteModal(job: ImportJobSummary) {
  deleteTarget.value = job
  deleteError.value = ''
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  deleteError.value = ''
  try {
    await $fetch(`/api/admin/import/jobs/${encodeURIComponent(deleteTarget.value.id)}`, { method: 'DELETE' })
    deleteModalOpen.value = false
    if (detailJob.value?.id === deleteTarget.value.id) {
      detailModalOpen.value = false
    }
    await githubRefresh()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete job'
    deleteError.value = (err as { data?: { message?: string } })?.data?.message ?? msg
  } finally {
    deleteLoading.value = false
  }
}

const githubColumns: TableColumn<ImportJobSummary>[] = [
  {
    accessorKey: 'organization',
    header: 'Organization',
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.organization)
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => h(UBadge, { color: jobStatusColor(row.original.status), variant: 'subtle' }, () => row.original.status)
  },
  {
    id: 'progress',
    header: 'Progress',
    cell: ({ row }) => {
      const job = row.original
      const parts = [`${job.completed}/${job.total}`]
      if (job.failed > 0) parts.push(`${job.failed} failed`)
      if (job.skipped > 0) parts.push(`${job.skipped} skipped`)
      return h('span', { class: 'text-sm' }, parts.join(' · '))
    }
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => h('div', {}, [
      h('div', { class: 'text-sm' }, new Date(row.original.createdAt).toLocaleString()),
      h('div', { class: 'text-xs text-(--ui-text-muted)' }, ageLabel(row.original.createdAt))
    ])
  },
  {
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
    cell: ({ row }) => {
      const job = row.original
      const canCancel = job.status === 'queued' || job.status === 'running'
      return h('div', { class: 'flex gap-2' }, [
        h(UButton, {
          size: 'xs',
          color: 'neutral',
          variant: 'outline',
          icon: 'i-lucide-eye',
          label: 'View',
          onClick: () => openDetail(job.id)
        }),
        canCancel
          ? h(UButton, {
              size: 'xs',
              color: 'error',
              variant: 'outline',
              icon: 'i-lucide-x',
              label: cancellingId.value === job.id ? 'Cancelling…' : 'Cancel',
              loading: cancellingId.value === job.id,
              onClick: () => cancelJob(job.id)
            })
          : h(UButton, {
              size: 'xs',
              color: 'error',
              variant: 'ghost',
              icon: 'i-lucide-trash-2',
              label: 'Delete',
              onClick: () => openDeleteModal(job)
            })
      ])
    }
  }
]

// --- Health-refresh jobs ---

const { searchInput: healthSearchInput, debouncedSearch: healthDebouncedSearch } = useTableSearch()
const healthStatusFilter = ref('all')
const healthStatusQueryParam = computed(() => healthStatusFilter.value === 'all' ? '' : healthStatusFilter.value)

const { page: healthPage, pageSize: healthPageSize, offset: healthOffset } = usePaginatedSorting({
  pageSize: 25,
  resetOn: [healthDebouncedSearch, healthStatusFilter]
})

const { data: healthData, pending: healthPending, error: healthFetchError, refresh: healthRefresh } = await useFetch<ApiResponse<HealthRefreshJobSummary>>(
  '/api/admin/health-refresh/jobs',
  { query: { skip: healthOffset, limit: healthPageSize, search: healthDebouncedSearch, status: healthStatusQueryParam } }
)

const healthJobs = useApiData(healthData)
const healthTotal = useApiCount(healthData)

function healthItemStatusColor(status: HealthRefreshJobItemStatus): 'success' | 'error' | 'warning' | 'info' | 'neutral' {
  if (status === 'refreshed') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'skipped') return 'warning'
  if (status === 'running') return 'info'
  return 'neutral'
}

const healthDetailModalOpen = ref(false)
const healthDetailJob = ref<HealthRefreshJobDetail | null>(null)
const healthDetailLoading = ref(false)
const healthDetailError = ref('')

async function openHealthDetail(id: string) {
  healthDetailModalOpen.value = true
  healthDetailLoading.value = true
  healthDetailError.value = ''
  healthDetailJob.value = null
  try {
    const res = await $fetch<{ success: boolean; data: HealthRefreshJobDetail }>(`/api/admin/health-refresh/jobs/${encodeURIComponent(id)}`)
    healthDetailJob.value = res.data
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to load job details'
    healthDetailError.value = (err as { data?: { message?: string } })?.data?.message ?? msg
  } finally {
    healthDetailLoading.value = false
  }
}

const healthCancelError = ref('')
const healthCancellingId = ref('')

async function cancelHealthJob(id: string) {
  healthCancelError.value = ''
  healthCancellingId.value = id
  try {
    const res = await $fetch<{ success: boolean; data: HealthRefreshJobDetail }>(
      `/api/admin/health-refresh/jobs/${encodeURIComponent(id)}/cancel`,
      { method: 'POST' }
    )
    if (healthDetailJob.value?.id === id) {
      healthDetailJob.value = res.data
    }
    await healthRefresh()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to cancel job'
    healthCancelError.value = (err as { data?: { message?: string } })?.data?.message ?? msg
  } finally {
    healthCancellingId.value = ''
  }
}

const healthDeleteModalOpen = ref(false)
const healthDeleteTarget = ref<HealthRefreshJobSummary | null>(null)
const healthDeleteLoading = ref(false)
const healthDeleteError = ref('')

function openHealthDeleteModal(job: HealthRefreshJobSummary) {
  healthDeleteTarget.value = job
  healthDeleteError.value = ''
  healthDeleteModalOpen.value = true
}

async function confirmHealthDelete() {
  if (!healthDeleteTarget.value) return
  healthDeleteLoading.value = true
  healthDeleteError.value = ''
  try {
    await $fetch(`/api/admin/health-refresh/jobs/${encodeURIComponent(healthDeleteTarget.value.id)}`, { method: 'DELETE' })
    healthDeleteModalOpen.value = false
    if (healthDetailJob.value?.id === healthDeleteTarget.value.id) {
      healthDetailModalOpen.value = false
    }
    await healthRefresh()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete job'
    healthDeleteError.value = (err as { data?: { message?: string } })?.data?.message ?? msg
  } finally {
    healthDeleteLoading.value = false
  }
}

const healthColumns: TableColumn<HealthRefreshJobSummary>[] = [
  {
    accessorKey: 'systemName',
    header: 'System',
    cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.systemName || 'All systems')
  },
  {
    accessorKey: 'trigger',
    header: 'Trigger',
    cell: ({ row }) => h(UBadge, { color: 'neutral', variant: 'subtle' }, () => row.original.trigger)
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => h(UBadge, { color: jobStatusColor(row.original.status), variant: 'subtle' }, () => row.original.status)
  },
  {
    id: 'progress',
    header: 'Progress',
    cell: ({ row }) => {
      const job = row.original
      const parts = [`${job.completedItems}/${job.totalItems}`]
      if (job.failedItems > 0) parts.push(`${job.failedItems} failed`)
      return h('span', { class: 'text-sm' }, parts.join(' · '))
    }
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => h('div', {}, [
      h('div', { class: 'text-sm' }, new Date(row.original.createdAt).toLocaleString()),
      h('div', { class: 'text-xs text-(--ui-text-muted)' }, ageLabel(row.original.createdAt))
    ])
  },
  {
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
    cell: ({ row }) => {
      const job = row.original
      const canCancel = job.status === 'queued' || job.status === 'running'
      return h('div', { class: 'flex gap-2' }, [
        h(UButton, {
          size: 'xs',
          color: 'neutral',
          variant: 'outline',
          icon: 'i-lucide-eye',
          label: 'View',
          onClick: () => openHealthDetail(job.id)
        }),
        canCancel
          ? h(UButton, {
              size: 'xs',
              color: 'error',
              variant: 'outline',
              icon: 'i-lucide-x',
              label: healthCancellingId.value === job.id ? 'Cancelling…' : 'Cancel',
              loading: healthCancellingId.value === job.id,
              onClick: () => cancelHealthJob(job.id)
            })
          : h(UButton, {
              size: 'xs',
              color: 'error',
              variant: 'ghost',
              icon: 'i-lucide-trash-2',
              label: 'Delete',
              onClick: () => openHealthDeleteModal(job)
            })
      ])
    }
  }
]

const tabItems = computed(() => [
  { label: `GitHub Imports (${githubTotal.value})`, slot: 'github' as const },
  { label: `Health Refresh (${healthTotal.value})`, slot: 'health' as const }
])

// Light polling while this monitoring page is open so status/progress stays fresh.
let pollTimer: ReturnType<typeof setTimeout> | null = null
function schedulePoll() {
  pollTimer = setTimeout(async () => {
    await Promise.all([githubRefresh(), healthRefresh()])
    schedulePoll()
  }, 8000)
}

onMounted(schedulePoll)
onUnmounted(() => {
  if (pollTimer) clearTimeout(pollTimer)
})

useHead({ title: 'Background Jobs - Polaris' })
</script>
