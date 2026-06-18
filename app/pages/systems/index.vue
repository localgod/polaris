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
        <h3 class="text-lg font-semibold">Import System from GitHub</h3>
      </template>
      <template #body>
        <UForm id="import-form" :schema="importSchema" :state="importState" class="space-y-4" @submit="onImport">
          <UAlert
            color="info"
            variant="subtle"
            icon="i-lucide-info"
            title="Initial scan may be incomplete"
            description="Dependencies are discovered from manifest files fetched via the GitHub API. The full transitive dependency graph is only available after the polaris-sbom.yml workflow runs against this repository."
          />

          <UFormField name="organization" label="GitHub Owner" required>
            <UInput
              v-model="importState.organization"
              placeholder="owner or https://github.com/owner"
              :disabled="isImporting"
            />
          </UFormField>

          <div class="grid md:grid-cols-3 gap-3">
            <UFormField name="language" label="Language">
              <UInput v-model="importState.language" placeholder="TypeScript" :disabled="isImporting" />
            </UFormField>
            <UFormField name="topic" label="Topic">
              <UInput v-model="importState.topic" placeholder="platform" :disabled="isImporting" />
            </UFormField>
            <UFormField name="namePattern" label="Name Pattern">
              <UInput v-model="importState.namePattern" placeholder="^service-" :disabled="isImporting" />
            </UFormField>
          </div>

          <div v-if="ownerRepositories.length" class="space-y-3 rounded-md border border-(--ui-border) p-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="font-medium">{{ ownerRepositories.length }} repositories found</p>
                <p class="text-sm text-(--ui-text-muted)">{{ selectedRepositoryFullNames.length }} selected</p>
              </div>
              <div class="flex gap-2">
                <UButton label="Select All" size="xs" color="neutral" variant="outline" :disabled="isImporting" @click="selectAllOwnerRepositories" />
                <UButton label="Clear" size="xs" color="neutral" variant="ghost" :disabled="isImporting" @click="clearSelectedOwnerRepositories" />
              </div>
            </div>
            <div class="max-h-72 overflow-auto divide-y divide-(--ui-border)">
              <label
                v-for="repo in ownerRepositories"
                :key="repo.fullName"
                class="flex cursor-pointer items-start gap-3 py-2"
              >
                <UCheckbox
                  :model-value="selectedRepositoryFullNames.includes(repo.fullName)"
                  :disabled="isImporting"
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
          </div>

          <UFormField name="ownerTeam" label="Owner Team" required>
            <USelect v-model="importState.ownerTeam" :items="importTeamItems" placeholder="Select a team" :disabled="isImporting" />
          </UFormField>

          <div v-if="activeImportJob" class="space-y-3 rounded-md border border-(--ui-border) p-3">
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
              <div class="h-full bg-(--ui-primary)" :style="{ width: `${importProgressPercent}%` }" />
            </div>
            <div v-if="activeImportJob.items.length" class="max-h-56 overflow-auto divide-y divide-(--ui-border)">
              <div v-for="item in activeImportJob.items" :key="item.id" class="flex items-start justify-between gap-3 py-2">
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ item.repositoryFullName }}</p>
                  <p v-if="item.message" class="text-xs text-(--ui-text-muted)">{{ item.message }}</p>
                </div>
                <UBadge :color="importItemStatusColor(item.status)" variant="subtle">
                  {{ item.status }}
                </UBadge>
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
        </UForm>
      </template>
      <template #footer>
        <UButton label="Cancel" color="neutral" variant="outline" :disabled="isImporting" @click="closeImportModal" />
        <UButton
          type="submit"
          form="import-form"
          :loading="isImporting || isFetchingRepositories"
          :disabled="isImportSubmitDisabled"
          :label="importSubmitLabel"
          color="primary"
        />
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

interface SystemsResponse {
  success: boolean
  data: System[]
  count: number
  total?: number
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
      const items = [[
        { label: 'View Details', icon: 'i-lucide-eye', onSelect: () => navigateTo(`/systems/${encodeURIComponent(system.name)}`) },
        ...(isSuperuser.value ? [
          { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => openEditSystemModal(system) },
          { label: 'Delete', icon: 'i-lucide-trash-2', onSelect: () => openDeleteSystemModal(system.name) }
        ] : [])
      ]]
      return h(resolveComponent('UDropdownMenu'), { items, content: { align: 'end' } }, {
        default: () => h(resolveComponent('UButton'), { icon: 'i-lucide-ellipsis-vertical', color: 'neutral', variant: 'ghost', size: 'sm' })
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

const importSchema = z.object({
  organization: z.string().min(1, 'GitHub owner is required'),
  language: z.string().optional(),
  topic: z.string().optional(),
  namePattern: z.string().optional(),
  ownerTeam: z.string().min(1, 'Owner team is required')
})
type ImportSchema = z.infer<typeof importSchema>

const { data: teamsData } = await useFetch<TeamsResponse>('/api/teams')
const importTeamItems = computed(() =>
  (teamsData.value?.data || []).map(t => ({ label: t.name, value: t.name }))
)

const toast = useToast()
const showImportModal = ref(false)
const isImporting = ref(false)
const isFetchingRepositories = ref(false)
const importError = ref('')
const activeImportJob = ref<ImportJob | null>(null)
const ownerRepositories = ref<OwnerRepository[]>([])
const selectedRepositoryFullNames = ref<string[]>([])
let importPollTimer: ReturnType<typeof setInterval> | null = null

const importState = reactive<Partial<ImportSchema>>({
  organization: '',
  language: '',
  topic: '',
  namePattern: '',
  ownerTeam: ''
})

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

const importSubmitLabel = computed(() => {
  return ownerRepositories.value.length > 0 ? 'Import Selected' : 'Fetch Repositories'
})

const isImportSubmitDisabled = computed(() => {
  if (isImporting.value || isFetchingRepositories.value) return true
  if (ownerRepositories.value.length > 0) {
    return selectedRepositoryFullNames.value.length === 0
  }
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
    .filter(fullName => current.has(fullName))
}

watch(
  () => [
    importState.organization,
    importState.language,
    importState.topic,
    importState.namePattern
  ],
  () => {
    resetOwnerRepositorySelection()
  }
)

function closeImportModal() {
  showImportModal.value = false
  setTimeout(() => {
    Object.assign(importState, {
      organization: '',
      language: '',
      topic: '',
      namePattern: '',
      ownerTeam: ''
    })
    importError.value = ''
    activeImportJob.value = null
    resetOwnerRepositorySelection()
  }, 300)
}

async function onImport(event: FormSubmitEvent<ImportSchema>) {
  isImporting.value = true
  importError.value = ''
  activeImportJob.value = null
  stopImportPolling()

  try {
    if (ownerRepositories.value.length === 0) {
      await fetchOwnerRepositories(event.data)
    } else {
      await startOrganizationImport(event.data)
    }
  }
  catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    importError.value = err.data?.message || err.message || 'Import failed'
  }
  finally {
    if (!activeImportJob.value) {
      isImporting.value = false
    }
  }
}

async function startOrganizationImport(data: ImportSchema) {
  const selected = ownerRepositories.value.filter(repo => selectedRepositoryFullNames.value.includes(repo.fullName))
  const body = {
    owner: data.organization,
    repositories: selected.map(repo => ({
      repositoryFullName: repo.fullName,
      repositoryUrl: repo.url
    })),
    filters: {
      language: data.language || undefined,
      topic: data.topic || undefined,
      namePattern: data.namePattern || undefined
    },
    ownerTeam: data.ownerTeam
  }

  const response = await $fetch<{ success: boolean; data: ImportJob }>('/api/admin/import/github-org', {
    method: 'POST',
    body
  })

  activeImportJob.value = response.data
  startImportPolling(response.data.id)
}

async function fetchOwnerRepositories(data: ImportSchema) {
  isFetchingRepositories.value = true
  importError.value = ''

  try {
    const response = await $fetch<{ success: boolean; data: OwnerRepository[]; count: number }>('/api/admin/import/github-org/repositories', {
      method: 'POST',
      body: {
        owner: data.organization,
        filters: {
          language: data.language || undefined,
          topic: data.topic || undefined,
          namePattern: data.namePattern || undefined
        }
      }
    })

    ownerRepositories.value = response.data
    selectAllOwnerRepositories()

    if (response.count === 0) {
      importError.value = 'No repositories matched the current owner and filters'
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
    alert(err.data?.message || err.message || 'Failed to delete system')
  } finally {
    isDeletingSystem.value = false
  }
}

useHead({ title: 'Systems - Polaris' })
</script>
