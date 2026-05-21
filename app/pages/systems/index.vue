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

          <UFormField name="repositoryUrl" label="GitHub Repository" required>
            <UInput
              v-model="importState.repositoryUrl"
              placeholder="owner/repo or https://github.com/owner/repo"
            />
            <template #help>
              <span class="text-(--ui-text-muted)">
                Repository metadata and dependencies will be fetched via the GitHub API.
              </span>
            </template>
          </UFormField>

          <UFormField name="domain" label="Domain">
            <UInput v-model="importState.domain" placeholder="Development" />
          </UFormField>

          <UFormField name="ownerTeam" label="Owner Team" required>
            <USelect v-model="importState.ownerTeam" :items="importTeamItems" placeholder="Select a team" />
          </UFormField>

          <UFormField name="businessCriticality" label="Business Criticality">
            <USelect v-model="importState.businessCriticality" :items="importCriticalityItems" placeholder="medium" />
          </UFormField>

          <UFormField name="environment" label="Environment">
            <USelect v-model="importState.environment" :items="importEnvironmentItems" placeholder="dev" />
          </UFormField>

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
        <UButton label="Cancel" color="neutral" variant="outline" @click="closeImportModal" />
        <UButton
          type="submit"
          form="import-form"
          :loading="isImporting"
          label="Import"
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

interface ImportResult {
  systemName: string
  repositoryUrl: string
  manifestsFound: number
  componentsAdded: number
  componentsUpdated: number
}

const importSchema = z.object({
  repositoryUrl: z.string().min(1, 'Repository URL is required'),
  domain: z.string().optional(),
  ownerTeam: z.string().min(1, 'Owner team is required'),
  businessCriticality: z.string().optional(),
  environment: z.string().optional()
})
type ImportSchema = z.infer<typeof importSchema>

const { data: teamsData } = await useFetch<TeamsResponse>('/api/teams')
const importTeamItems = computed(() =>
  (teamsData.value?.data || []).map(t => ({ label: t.name, value: t.name }))
)

const importCriticalityItems = [
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' }
]

const importEnvironmentItems = [
  { label: 'Development', value: 'dev' },
  { label: 'Test', value: 'test' },
  { label: 'Staging', value: 'staging' },
  { label: 'Production', value: 'prod' }
]

const toast = useToast()
const showImportModal = ref(false)
const isImporting = ref(false)
const importError = ref('')

const importState = reactive<Partial<ImportSchema>>({
  repositoryUrl: '',
  domain: '',
  ownerTeam: '',
  businessCriticality: '',
  environment: ''
})

function closeImportModal() {
  showImportModal.value = false
  setTimeout(() => {
    Object.assign(importState, { repositoryUrl: '', domain: '', ownerTeam: '', businessCriticality: '', environment: '' })
    importError.value = ''
  }, 300)
}

async function onImport(event: FormSubmitEvent<ImportSchema>) {
  isImporting.value = true
  importError.value = ''

  try {
    const body: Record<string, string> = { repositoryUrl: event.data.repositoryUrl }
    if (event.data.domain) body.domain = event.data.domain
    if (event.data.ownerTeam) body.ownerTeam = event.data.ownerTeam
    if (event.data.businessCriticality) body.businessCriticality = event.data.businessCriticality
    if (event.data.environment) body.environment = event.data.environment

    const response = await $fetch<{ success: boolean; data: ImportResult }>('/api/admin/import/github', {
      method: 'POST',
      body
    })

    if (response.success) {
      const result = response.data
      closeImportModal()
      await refreshNuxtData()
      toast.add({
        title: `${result.systemName} imported`,
        description: `${result.manifestsFound} manifest(s) found · ${result.componentsAdded} added · ${result.componentsUpdated} updated`,
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    }
  }
  catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    importError.value = err.data?.message || err.message || 'Import failed'
  }
  finally {
    isImporting.value = false
  }
}

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
