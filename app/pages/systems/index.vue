<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <UPageHeader
        title="Systems"
        description="Deployable applications and services"
      />
      <div class="flex gap-2">
        <UButton
          v-if="isSuperuser"
          label="Import from GitHub"
          icon="i-lucide-github"
          color="neutral"
          variant="outline"
          @click="showImportModal = true"
        />
        <UButton
          v-if="status === 'authenticated'"
          label="+ Create System"
          to="/systems/new"
          color="primary"
        />
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Error Loading Systems"
      :description="error.message"
    />

    <template v-else>
      <UCard>
        <UTable
          v-model:sorting="sorting"
          :manual-sorting="true"
          :data="systems"
          :columns="columns"
          :loading="pending"
          class="flex-1"
        >
          <template #empty>
            <div class="text-center py-12">
              <UIcon name="i-lucide-inbox" class="text-5xl text-(--ui-text-muted)" />
              <h3 class="mt-4">No Systems Found</h3>
              <p class="text-(--ui-text-muted) mt-2">
                The database appears to be empty. Try running: <code>npm run seed</code>
              </p>
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

    <!-- Import from GitHub Modal -->
    <UModal v-model:open="showImportModal" :ui="{ footer: 'justify-end' }">
      <template #header>
        <h3 class="text-lg font-semibold">Import from GitHub</h3>
      </template>
      <template #body>
        <div class="space-y-6">
          <!-- Step indicator -->
          <div class="flex items-center">
            <template v-for="(stepLabel, i) in ['Organization', 'Repositories', 'Configure', 'Progress']" :key="i">
              <div class="flex items-center gap-1.5 shrink-0">
                <div
                  class="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                  :class="importStep > i ? 'bg-(--ui-success) text-white' : importStep === i ? 'bg-(--ui-primary) text-white' : 'bg-(--ui-bg-elevated) text-(--ui-text-muted)'"
                >
                  <UIcon v-if="importStep > i" name="i-lucide-check" class="size-3" />
                  <span v-else>{{ i + 1 }}</span>
                </div>
                <span class="text-xs hidden sm:inline" :class="importStep === i ? 'font-semibold' : 'text-(--ui-text-muted)'">{{ stepLabel }}</span>
              </div>
              <div v-if="i < 3" class="flex-1 h-px bg-(--ui-border) mx-2 min-w-2" />
            </template>
          </div>

          <!-- Step 0: Organization -->
          <div v-if="importStep === 0" class="space-y-4">
            <UAlert
              color="info"
              variant="subtle"
              icon="i-lucide-info"
              title="Initial scan may be incomplete"
              description="Dependencies are discovered from manifest files fetched via the GitHub API. The full transitive dependency graph is only available after the polaris-sbom.yml workflow runs against this repository."
            />
            <UFormField label="GitHub Owner" required>
              <UInput
                v-model="importOrganization"
                placeholder="owner or https://github.com/owner"
                :disabled="isFetchingRepositories"
                @keydown.enter.prevent="nextStep"
              />
            </UFormField>
            <UAlert
              v-if="importError"
              color="error"
              variant="subtle"
              icon="i-lucide-alert-circle"
              :description="importError"
            />
          </div>

          <!-- Step 1: Select repositories -->
          <div v-else-if="importStep === 1" class="space-y-4">
            <USkeleton v-if="isFetchingRepositories" class="h-64 w-full" />
            <template v-else>
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p class="font-medium">{{ ownerRepositories.length }} repositories found</p>
                  <p class="text-sm text-(--ui-text-muted)">{{ selectedRepositoryFullNames.length }} selected</p>
                </div>
                <div class="flex gap-2">
                  <UButton label="Select All" size="xs" color="neutral" variant="outline" @click="selectAllOwnerRepositories" />
                  <UButton label="Clear" size="xs" color="neutral" variant="ghost" @click="clearSelectedOwnerRepositories" />
                </div>
              </div>
              <div class="max-h-80 overflow-auto divide-y divide-(--ui-border) rounded-md border border-(--ui-border)">
                <label
                  v-for="repo in ownerRepositories"
                  :key="repo.fullName"
                  class="flex cursor-pointer items-start gap-3 px-3 py-2"
                >
                  <UCheckbox
                    :model-value="selectedRepositoryFullNames.includes(repo.fullName)"
                    @update:model-value="toggleOwnerRepository(repo.fullName, Boolean($event))"
                  />
                  <span class="min-w-0 flex-1">
                    <span class="flex flex-wrap items-center gap-2">
                      <span class="truncate text-sm font-medium">{{ repo.fullName }}</span>
                      <UBadge v-if="repo.private" color="warning" variant="subtle">private</UBadge>
                      <UBadge v-if="repo.archived" color="neutral" variant="subtle">archived</UBadge>
                      <UBadge v-if="repo.fork" color="info" variant="subtle">fork</UBadge>
                    </span>
                    <span class="mt-1 block truncate text-xs text-(--ui-text-muted)">
                      {{ repo.language || 'Unknown language' }}<template v-if="repo.description"> · {{ repo.description }}</template>
                    </span>
                  </span>
                </label>
              </div>
            </template>
            <UAlert
              v-if="importError"
              color="error"
              variant="subtle"
              icon="i-lucide-alert-circle"
              :description="importError"
            />
          </div>

          <!-- Step 2: Configure each repository -->
          <div v-else-if="importStep === 2" class="space-y-4">
            <UFormField label="Default team">
              <USelect
                v-model="defaultTeam"
                :items="importTeamItems"
                placeholder="Select a team to pre-fill all rows"
                @update:model-value="applyDefaultTeam"
              />
            </UFormField>
            <p class="text-xs text-(--ui-text-muted)">Enter the same system name on multiple repositories to group them under one system.</p>
            <div class="rounded-md border border-(--ui-border) overflow-hidden">
              <div class="grid grid-cols-[1fr_160px_140px] gap-2 bg-(--ui-bg-elevated) px-3 py-2 text-xs font-medium text-(--ui-text-muted)">
                <span>Repository</span>
                <span>Owner team *</span>
                <span>System name</span>
              </div>
              <div class="divide-y divide-(--ui-border)">
                <div
                  v-for="config in repoConfigs"
                  :key="config.repositoryFullName"
                  class="grid grid-cols-[1fr_160px_140px] gap-2 px-3 py-2 items-center"
                >
                  <p class="text-sm truncate font-medium">{{ config.repositoryFullName }}</p>
                  <USelect
                    v-model="config.ownerTeam"
                    :items="importTeamItems"
                    placeholder="Team"
                    size="sm"
                  />
                  <UInput
                    v-model="config.systemName"
                    :placeholder="deriveSystemName(config.repositoryFullName)"
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: Progress -->
          <div v-else-if="importStep === 3" class="space-y-4">
            <USkeleton v-if="!activeImportJob" class="h-32 w-full" />
            <div v-else class="space-y-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="font-medium">{{ importProgressLabel }}</p>
                  <p class="text-sm text-(--ui-text-muted)">{{ activeImportJob.status }}</p>
                </div>
                <UBadge :color="importJobStatusColor" variant="subtle">
                  {{ activeImportJob.completed }}/{{ activeImportJob.total }}
                </UBadge>
              </div>
              <div class="h-2 overflow-hidden rounded bg-(--ui-bg-elevated)">
                <div class="h-full bg-(--ui-primary) transition-all duration-300" :style="{ width: `${importProgressPercent}%` }" />
              </div>
              <div v-if="activeImportJob.items.length" class="max-h-64 overflow-auto divide-y divide-(--ui-border) rounded-md border border-(--ui-border)">
                <div v-for="item in activeImportJob.items" :key="item.id" class="flex items-start justify-between gap-3 px-3 py-2">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium">{{ item.repositoryFullName }}</p>
                    <p v-if="item.message" class="text-xs text-(--ui-text-muted)">{{ item.message }}</p>
                  </div>
                  <UBadge :color="importItemStatusColor(item.status)" variant="subtle">{{ item.status }}</UBadge>
                </div>
              </div>
            </div>
            <UAlert
              v-if="importError"
              color="error"
              variant="subtle"
              icon="i-lucide-alert-circle"
              :description="importError"
            />
          </div>
        </div>
      </template>
      <template #footer>
        <template v-if="importStep === 0">
          <UButton label="Cancel" color="neutral" variant="outline" @click="closeImportModal" />
          <UButton
            label="Next"
            icon="i-lucide-arrow-right"
            trailing
            :disabled="nextDisabled"
            :loading="isFetchingRepositories"
            color="primary"
            @click="nextStep"
          />
        </template>
        <template v-else-if="importStep === 1">
          <UButton label="Back" icon="i-lucide-arrow-left" color="neutral" variant="outline" @click="prevStep" />
          <UButton
            label="Next"
            icon="i-lucide-arrow-right"
            trailing
            :disabled="nextDisabled"
            color="primary"
            @click="nextStep"
          />
        </template>
        <template v-else-if="importStep === 2">
          <UButton label="Back" icon="i-lucide-arrow-left" color="neutral" variant="outline" @click="prevStep" />
          <UButton
            label="Start Import"
            icon="i-lucide-upload"
            trailing
            :disabled="nextDisabled"
            :loading="isImporting"
            color="primary"
            @click="nextStep"
          />
        </template>
        <template v-else-if="importStep === 3">
          <UButton
            label="Close"
            color="neutral"
            variant="outline"
            :disabled="isJobRunning"
            @click="closeImportModal"
          />
        </template>
      </template>
    </UModal>

    <!-- Edit System Modal -->
    <UModal v-model:open="showEditSystemModal" :ui="{ footer: 'justify-end' }">
      <template #header>
        <h3 class="text-lg font-semibold">Edit System: {{ editSystemName }}</h3>
      </template>
      <template #body>
        <UForm id="edit-system-form" :schema="editSystemSchema" :state="editSystemState" class="space-y-4" @submit="onEditSystem">
          <UFormField name="domain" label="Domain" required>
            <UInput v-model="editSystemState.domain" />
          </UFormField>
          <UFormField name="ownerTeam" label="Owner Team" required>
            <USelect v-model="editSystemState.ownerTeam" :items="editTeamOptions" placeholder="Select team" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField name="businessCriticality" label="Criticality" required>
              <USelect v-model="editSystemState.businessCriticality" :items="['low', 'medium', 'high', 'critical']" />
            </UFormField>
            <UFormField name="environment" label="Environment" required>
              <USelect v-model="editSystemState.environment" :items="['dev', 'test', 'staging', 'prod']" />
            </UFormField>
          </div>
          <UFormField name="description" label="Description">
            <UTextarea v-model="editSystemState.description" placeholder="System description" />
          </UFormField>
          <UAlert v-if="editSystemError" color="error" variant="subtle" icon="i-lucide-alert-circle" :description="editSystemError" />
        </UForm>
      </template>
      <template #footer="{ close }">
        <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
        <UButton type="submit" form="edit-system-form" :loading="isEditingSystem" label="Save" />
      </template>
    </UModal>

    <!-- Delete System Confirmation Modal -->
    <UModal v-model:open="showDeleteSystemModal">
      <template #header>
        <h3 class="text-lg font-semibold">Delete System</h3>
      </template>
      <template #body>
        <p>Are you sure you want to delete <strong>{{ deleteSystemTarget }}</strong>?</p>
        <p class="text-sm text-(--ui-text-muted) mt-2">This will remove the system and all its component relationships. This action cannot be undone.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="outline" @click="showDeleteSystemModal = false" />
          <UButton
            :label="isDeletingSystem ? 'Deleting...' : 'Delete'"
            color="error"
            :loading="isDeletingSystem"
            @click="confirmDeleteSystem"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import * as z from 'zod'
import type { TableColumn, FormSubmitEvent } from '@nuxt/ui'

const { status } = useAuth()
const { isSuperuser } = useEffectiveRole()
const { getSortableHeader } = useSortableTable()

interface System {
  name: string
  domain: string
  ownerTeam: string | null
  businessCriticality: string
  environment: string
  componentCount: number
  repositoryCount: number
}

const actionInProgress = ref<Set<string>>(new Set())

interface SystemsResponse {
  success: boolean
  data: System[]
  count: number
  total?: number
}

async function triggerHealthRefresh(system: System) {
  if (actionInProgress.value.has(system.name)) return
  actionInProgress.value = new Set([...actionInProgress.value, system.name])
  try {
    await $fetch(`/api/systems/${encodeURIComponent(system.name)}/health-refresh`, { method: 'POST' })
    toast.add({
      title: 'Health refresh queued',
      description: `Health data for ${system.name} will be updated shortly.`,
      color: 'success',
      icon: 'i-lucide-refresh-cw'
    })
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'Health refresh failed',
      description: err.data?.message || err.message || 'Unknown error',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    const next = new Set(actionInProgress.value)
    next.delete(system.name)
    actionInProgress.value = next
  }
}

async function triggerRescan(system: System) {
  if (actionInProgress.value.has(system.name)) return
  actionInProgress.value = new Set([...actionInProgress.value, system.name])
  try {
    const response = await $fetch<{ success: boolean; data: { total: number; succeeded: number; failed: number } }>(
      `/api/admin/systems/${encodeURIComponent(system.name)}/rescan`,
      { method: 'POST' }
    )
    const { succeeded, failed, total } = response.data
    toast.add({
      title: 'Rescan complete',
      description: `${succeeded}/${total} repositories rescanned successfully${failed > 0 ? ` · ${failed} failed` : ''}.`,
      color: failed > 0 ? 'warning' : 'success',
      icon: failed > 0 ? 'i-lucide-alert-triangle' : 'i-lucide-check-circle'
    })
    await refreshNuxtData()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    toast.add({
      title: 'Rescan failed',
      description: err.data?.message || err.message || 'Unknown error',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    const next = new Set(actionInProgress.value)
    next.delete(system.name)
    actionInProgress.value = next
  }
}

function getCriticalityColor(criticality: string): 'error' | 'warning' | 'success' | 'neutral' {
  const colors: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error',
    high: 'warning',
    medium: 'success',
    low: 'neutral'
  }
  return colors[criticality] || 'neutral'
}

const columns: TableColumn<System>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => getSortableHeader(column, 'Name'),
    cell: ({ row }) => {
      const system = row.original
      return h('div', {}, [
        h(resolveComponent('NuxtLink'), {
          to: `/systems/${encodeURIComponent(system.name)}`,
          class: 'font-semibold hover:underline'
        }, () => system.name),
        h('p', { class: 'text-sm text-(--ui-text-muted)' }, system.domain)
      ])
    }
  },
  {
    accessorKey: 'businessCriticality',
    header: ({ column }) => getSortableHeader(column, 'Criticality'),
    cell: ({ row }) => {
      const criticality = row.getValue('businessCriticality') as string
      return h(resolveComponent('UBadge'), { color: getCriticalityColor(criticality), variant: 'subtle' }, () => criticality)
    }
  },
  {
    accessorKey: 'environment',
    header: ({ column }) => getSortableHeader(column, 'Environment')
  },
  {
    accessorKey: 'ownerTeam',
    header: ({ column }) => getSortableHeader(column, 'Owner'),
    cell: ({ row }) => {
      const owner = row.getValue('ownerTeam') as string | null
      if (!owner) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h('span', { class: 'font-medium' }, owner)
    }
  },
  {
    accessorKey: 'componentCount',
    header: ({ column }) => getSortableHeader(column, 'Components')
  },
  {
    accessorKey: 'repositoryCount',
    header: ({ column }) => getSortableHeader(column, 'Repositories')
  },
  {
    id: 'actions',
    header: '',
    meta: { class: { th: 'w-10', td: 'text-right' } },
    cell: ({ row }) => {
      const system = row.original
      const busy = actionInProgress.value.has(system.name)
      const items = [[
        { label: 'View Details', icon: 'i-lucide-eye', onSelect: () => navigateTo(`/systems/${encodeURIComponent(system.name)}`) },
        ...(isSuperuser.value ? [
          { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => openEditSystemModal(system) },
          { label: 'Rescan dependencies', icon: 'i-lucide-git-branch', disabled: busy || system.repositoryCount === 0, onSelect: () => triggerRescan(system) },
          { label: 'Refresh health data', icon: 'i-lucide-refresh-cw', disabled: busy, onSelect: () => triggerHealthRefresh(system) },
          { label: 'Delete', icon: 'i-lucide-trash-2', onSelect: () => openDeleteSystemModal(system.name) }
        ] : [])
      ]]
      return h(resolveComponent('UDropdownMenu'), { items, content: { align: 'end' } }, {
        default: () => h(resolveComponent('UButton'), { icon: busy ? 'i-lucide-loader-circle' : 'i-lucide-ellipsis-vertical', color: 'neutral', variant: 'ghost', size: 'sm' })
      })
    }
  }
]

const sorting = ref([])
const page = ref(1)
const pageSize = 20

watch(sorting, () => { page.value = 1 })

const sortBy = computed(() => sorting.value.length ? sorting.value[0].id : undefined)
const sortOrder = computed(() => sorting.value.length ? (sorting.value[0].desc ? 'desc' : 'asc') : undefined)
const offset = computed(() => (page.value - 1) * pageSize)

const { data, pending, error } = await useFetch<SystemsResponse>('/api/systems', {
  query: { limit: pageSize, offset, sortBy, sortOrder }
})

const systems = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

// --- Import from GitHub ---

interface TeamsResponse {
  success: boolean
  data: Array<{ name: string }>
  count: number
}

type ImportJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
type ImportJobItemStatus = 'pending' | 'running' | 'imported' | 'skipped' | 'failed'

interface ImportJobItem {
  id: string
  repositoryFullName: string
  repositoryUrl: string
  status: ImportJobItemStatus
  message: string | null
}

interface ImportJob {
  id: string
  status: ImportJobStatus
  organization: string
  total: number
  completed: number
  failed: number
  skipped: number
  error: string | null
  items: ImportJobItem[]
}

interface OwnerRepository {
  name: string
  fullName: string
  url: string
  description: string | null
  language: string | null
  private: boolean
  fork: boolean
  archived: boolean
  topics: string[]
}

interface RepoConfig {
  repositoryFullName: string
  repositoryUrl: string
  ownerTeam: string
  systemName: string
}

const { data: teamsData } = await useFetch<TeamsResponse>('/api/teams')
const importTeamItems = computed(() =>
  (teamsData.value?.data || []).map(t => ({ label: t.name, value: t.name }))
)

const toast = useToast()
const showImportModal = ref(false)
const importStep = ref(0)
const isImporting = ref(false)
const isFetchingRepositories = ref(false)
const importError = ref('')
const importOrganization = ref('')
const activeImportJob = ref<ImportJob | null>(null)
const ownerRepositories = ref<OwnerRepository[]>([])
const selectedRepositoryFullNames = ref<string[]>([])
const repoConfigs = ref<RepoConfig[]>([])
const defaultTeam = ref('')
let importPollTimer: ReturnType<typeof setInterval> | null = null
let importPollInFlight = false

const importProgressPercent = computed(() => {
  if (!activeImportJob.value?.total) return 0
  return Math.round((activeImportJob.value.completed / activeImportJob.value.total) * 100)
})

const importProgressLabel = computed(() => {
  const job = activeImportJob.value
  if (!job) return ''
  if (job.status === 'queued') return 'Queued'
  if (job.status === 'running') return `Importing ${job.completed}/${job.total} repositories`
  if (job.status === 'completed') return `Finished ${job.completed}/${job.total} repositories`
  return job.error || 'Import failed'
})

const importJobStatusColor = computed(() => {
  const status = activeImportJob.value?.status
  if (status === 'completed') return 'success'
  if (status === 'failed' || status === 'cancelled') return 'error'
  return 'info'
})

const isJobRunning = computed(() =>
  isImporting.value || (!!activeImportJob.value && ['queued', 'running'].includes(activeImportJob.value.status))
)

const nextDisabled = computed(() => {
  if (importStep.value === 0) return !importOrganization.value.trim() || isFetchingRepositories.value
  if (importStep.value === 1) return selectedRepositoryFullNames.value.length === 0
  if (importStep.value === 2) return repoConfigs.value.some(r => !r.ownerTeam)
  return false
})

function importItemStatusColor(status: ImportJobItemStatus): 'success' | 'error' | 'warning' | 'info' | 'neutral' {
  if (status === 'imported') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'skipped') return 'warning'
  if (status === 'running') return 'info'
  return 'neutral'
}

function stopImportPolling() {
  if (importPollTimer) {
    clearInterval(importPollTimer)
    importPollTimer = null
  }
}

function resetOwnerRepositorySelection() {
  ownerRepositories.value = []
  selectedRepositoryFullNames.value = []
}

function selectAllOwnerRepositories() {
  selectedRepositoryFullNames.value = ownerRepositories.value.map(repo => repo.fullName)
}

function clearSelectedOwnerRepositories() {
  selectedRepositoryFullNames.value = []
}

function toggleOwnerRepository(fullName: string, selected: boolean) {
  const current = new Set(selectedRepositoryFullNames.value)
  if (selected) {
    current.add(fullName)
  } else {
    current.delete(fullName)
  }
  selectedRepositoryFullNames.value = ownerRepositories.value
    .map(repo => repo.fullName)
    .filter(name => current.has(name))
}

function deriveSystemName(fullName: string): string {
  const repoName = fullName.split('/')[1] || fullName
  return repoName.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
}

function applyDefaultTeam(team: string) {
  repoConfigs.value.forEach(r => { r.ownerTeam = team })
}

async function nextStep() {
  if (importStep.value === 0) {
    await fetchOwnerRepositories()
    if (!importError.value) {
      importStep.value = 1
    }
  } else if (importStep.value === 1) {
    repoConfigs.value = selectedRepositoryFullNames.value.map(fullName => {
      const repo = ownerRepositories.value.find(r => r.fullName === fullName)!
      return { repositoryFullName: fullName, repositoryUrl: repo.url, ownerTeam: defaultTeam.value, systemName: '' }
    })
    importStep.value = 2
  } else if (importStep.value === 2) {
    importStep.value = 3
    await startOrganizationImport()
  }
}

function prevStep() {
  if (importStep.value === 1) {
    resetOwnerRepositorySelection()
    importError.value = ''
  }
  if (importStep.value === 2) {
    repoConfigs.value = []
  }
  importStep.value--
}

function closeImportModal() {
  stopImportPolling()
  showImportModal.value = false
  setTimeout(() => {
    importStep.value = 0
    importOrganization.value = ''
    importError.value = ''
    activeImportJob.value = null
    isImporting.value = false
    repoConfigs.value = []
    defaultTeam.value = ''
    resetOwnerRepositorySelection()
  }, 300)
}

async function startOrganizationImport() {
  isImporting.value = true
  importError.value = ''
  activeImportJob.value = null
  stopImportPolling()

  try {
    const response = await $fetch<{ success: boolean; data: ImportJob }>('/api/admin/import/github-org', {
      method: 'POST',
      body: {
        owner: importOrganization.value,
        repositories: repoConfigs.value.map(r => ({
          repositoryFullName: r.repositoryFullName,
          repositoryUrl: r.repositoryUrl,
          ownerTeam: r.ownerTeam || undefined,
          systemName: r.systemName || undefined
        })),
        ownerTeam: defaultTeam.value || repoConfigs.value[0]?.ownerTeam || ''
      }
    })

    activeImportJob.value = response.data
    startImportPolling(response.data.id)
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    importError.value = err.data?.message || err.message || 'Import failed'
    isImporting.value = false
  }
}

async function fetchOwnerRepositories() {
  isFetchingRepositories.value = true
  importError.value = ''

  try {
    const response = await $fetch<{ success: boolean; data: OwnerRepository[]; count: number }>('/api/admin/import/github-org/repositories', {
      method: 'POST',
      body: { owner: importOrganization.value }
    })

    ownerRepositories.value = response.data
    selectAllOwnerRepositories()

    if (response.count === 0) {
      importError.value = 'No repositories found for this owner'
    }
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    importError.value = err.data?.message || err.message || 'Failed to fetch repositories'
  } finally {
    isFetchingRepositories.value = false
  }
}

function startImportPolling(jobId: string) {
  const poll = async () => {
    if (importPollInFlight) return
    importPollInFlight = true

    try {
      const response = await $fetch<{ success: boolean; data: ImportJob }>(`/api/admin/import/jobs/${encodeURIComponent(jobId)}`)
      activeImportJob.value = response.data

      if (['completed', 'failed', 'cancelled'].includes(response.data.status)) {
        stopImportPolling()
        isImporting.value = false

        if (response.data.status === 'completed') {
          await refreshNuxtData()
          toast.add({
            title: 'Owner import complete',
            description: `${response.data.completed}/${response.data.total} finished · ${response.data.failed} failed · ${response.data.skipped} skipped`,
            color: response.data.failed > 0 ? 'warning' : 'success',
            icon: response.data.failed > 0 ? 'i-lucide-alert-triangle' : 'i-lucide-check-circle'
          })
        } else {
          importError.value = response.data.error || 'Import failed'
        }
      }
    } catch (error: unknown) {
      stopImportPolling()
      isImporting.value = false
      const err = error as { data?: { message?: string }; message?: string }
      importError.value = err.data?.message || err.message || 'Failed to load import status'
    } finally {
      importPollInFlight = false
    }
  }

  void poll()
  importPollTimer = setInterval(() => { void poll() }, 2000)
}

onBeforeUnmount(() => {
  stopImportPolling()
})

// --- Edit System ---
const editSystemSchema = z.object({
  domain: z.string().min(1, 'Domain is required'),
  ownerTeam: z.string().min(1, 'Owner team is required'),
  businessCriticality: z.string().min(1, 'Criticality is required'),
  environment: z.string().min(1, 'Environment is required'),
  description: z.string().optional()
})
type EditSystemSchema = z.infer<typeof editSystemSchema>

const showEditSystemModal = ref(false)
const isEditingSystem = ref(false)
const editSystemError = ref('')
const editSystemName = ref('')
const editSystemState = reactive<Partial<EditSystemSchema>>({
  domain: '',
  ownerTeam: '',
  businessCriticality: '',
  environment: '',
  description: ''
})

const editTeamOptions = computed(() => {
  const teams = new Set<string>()
  systems.value.forEach(s => { if (s.ownerTeam) teams.add(s.ownerTeam) })
  return Array.from(teams).sort()
})

function openEditSystemModal(system: System) {
  editSystemName.value = system.name
  Object.assign(editSystemState, {
    domain: system.domain || '',
    ownerTeam: system.ownerTeam || '',
    businessCriticality: system.businessCriticality || 'medium',
    environment: system.environment || 'dev',
    description: ''
  })
  editSystemError.value = ''
  showEditSystemModal.value = true
}

async function onEditSystem(event: FormSubmitEvent<EditSystemSchema>) {
  isEditingSystem.value = true
  editSystemError.value = ''
  try {
    await $fetch(`/api/systems/${encodeURIComponent(editSystemName.value)}`, {
      method: 'PUT',
      body: {
        ...event.data,
        description: event.data.description || null
      }
    })
    showEditSystemModal.value = false
    await refreshNuxtData()
  }
  catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    editSystemError.value = err.data?.message || err.message || 'Failed to update system'
  }
  finally {
    isEditingSystem.value = false
  }
}

// --- Delete System ---
const showDeleteSystemModal = ref(false)
const deleteSystemTarget = ref('')
const isDeletingSystem = ref(false)

function openDeleteSystemModal(name: string) {
  deleteSystemTarget.value = name
  showDeleteSystemModal.value = true
}

async function confirmDeleteSystem() {
  isDeletingSystem.value = true
  try {
    await $fetch(`/api/systems/${encodeURIComponent(deleteSystemTarget.value)}`, { method: 'DELETE' })
    showDeleteSystemModal.value = false
    await refreshNuxtData()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    toast.add({ title: 'Error', description: err.data?.message || err.message || 'Failed to delete system', color: 'error' })
  } finally {
    isDeletingSystem.value = false
  }
}

useHead({ title: 'Systems - Polaris' })
</script>
