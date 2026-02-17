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
    <UModal v-model:open="showImportModal">
      <template #header>
        <h3 class="text-lg font-semibold">Import System from GitHub</h3>
      </template>
      <template #body>
        <form class="space-y-4" @submit.prevent="handleImport">
          <UFormField label="GitHub Repository" required>
            <UInput
              v-model="importForm.repositoryUrl"
              placeholder="owner/repo or https://github.com/owner/repo"
            />
            <template #help>
              <span class="text-(--ui-text-muted)">
                Repository metadata and dependencies will be fetched via the GitHub API.
              </span>
            </template>
          </UFormField>

          <UFormField label="Domain">
            <UInput
              v-model="importForm.domain"
              placeholder="Development"
            />
          </UFormField>

          <UFormField label="Owner Team">
            <USelect
              v-model="importForm.ownerTeam"
              :items="importTeamItems"
              placeholder="Select a team (optional)"
            />
          </UFormField>

          <UFormField label="Business Criticality">
            <USelect
              v-model="importForm.businessCriticality"
              :items="importCriticalityItems"
              placeholder="medium"
            />
          </UFormField>

          <UFormField label="Environment">
            <USelect
              v-model="importForm.environment"
              :items="importEnvironmentItems"
              placeholder="dev"
            />
          </UFormField>

          <UAlert
            v-if="importError"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-circle"
            :description="importError"
          />

          <UAlert
            v-if="importResult"
            color="success"
            variant="subtle"
            icon="i-lucide-check-circle"
          >
            <template #description>
              <div class="space-y-1">
                <p>System <strong>{{ importResult.systemName }}</strong> imported.</p>
                <p class="text-sm">
                  {{ importResult.manifestsFound }} manifest(s) found,
                  {{ importResult.componentsAdded }} component(s) added,
                  {{ importResult.componentsUpdated }} updated.
                </p>
              </div>
            </template>
          </UAlert>

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              label="Cancel"
              variant="outline"
              @click="closeImportModal"
            />
            <UButton
              type="submit"
              :loading="isImporting"
              :label="isImporting ? 'Importing...' : 'Import'"
              color="primary"
              :disabled="!importForm.repositoryUrl || !!importResult"
            />
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const { status, data: session } = useAuth()
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
        h('strong', {}, system.name),
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
        { label: 'Unmapped Components', icon: 'i-lucide-package-x', onSelect: () => navigateTo(`/systems/${encodeURIComponent(system.name)}/unmapped-components`) }
      ]]
      return h(resolveComponent('UDropdownMenu'), { items, content: { align: 'end' } }, {
        default: () => h(resolveComponent('UButton'), { icon: 'i-lucide-ellipsis-vertical', color: 'neutral', variant: 'ghost', size: 'sm' })
      })
    }
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

const { data, pending, error } = await useFetch<SystemsResponse>('/api/systems', { query: queryParams })

const systems = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

const isSuperuser = computed(() => session.value?.user?.role === 'superuser')

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

const showImportModal = ref(false)
const isImporting = ref(false)
const importError = ref('')
const importResult = ref<ImportResult | null>(null)

const importForm = ref({
  repositoryUrl: '',
  domain: '',
  ownerTeam: '',
  businessCriticality: '',
  environment: ''
})

function closeImportModal() {
  showImportModal.value = false
  // If import succeeded, refresh the systems list
  if (importResult.value) {
    refreshNuxtData()
  }
  // Reset form state after a short delay so the modal closes smoothly
  setTimeout(() => {
    importForm.value = { repositoryUrl: '', domain: '', ownerTeam: '', businessCriticality: '', environment: '' }
    importError.value = ''
    importResult.value = null
  }, 300)
}

async function handleImport() {
  isImporting.value = true
  importError.value = ''
  importResult.value = null

  try {
    const body: Record<string, string> = {
      repositoryUrl: importForm.value.repositoryUrl
    }
    if (importForm.value.domain) body.domain = importForm.value.domain
    if (importForm.value.ownerTeam) body.ownerTeam = importForm.value.ownerTeam
    if (importForm.value.businessCriticality) body.businessCriticality = importForm.value.businessCriticality
    if (importForm.value.environment) body.environment = importForm.value.environment

    const response = await $fetch<{ success: boolean; data: ImportResult }>('/api/admin/import/github', {
      method: 'POST',
      body
    })

    if (response.success) {
      importResult.value = response.data
    }
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }; message?: string }
    importError.value = err.data?.message || err.message || 'Import failed'
  } finally {
    isImporting.value = false
  }
}

useHead({ title: 'Systems - Polaris' })
</script>
