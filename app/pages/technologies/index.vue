<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <UPageHeader
        title="Technologies"
        description="Governed technology choices across the organization"
      />
      <UButton
        v-if="isSuperuser"
        label="+ Create Technology"
        to="/technologies/new"
      />
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Error"
      :description="error.message"
    />

    <template v-else>
      <UCard>
        <UTable
          v-model:sorting="sorting"
          :manual-sorting="true"
          :data="technologies"
          :columns="columns"
          :loading="pending"
          class="flex-1"
        >
          <template #empty>
            <div class="text-center text-(--ui-text-muted) py-12">
              No technologies found.
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

    <!-- Edit Technology Modal -->
    <UModal v-model:open="editModalOpen">
      <template #header>
        <h3 class="text-lg font-semibold">Edit Technology: {{ editForm.name }}</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Category *</label>
            <USelect v-model="editForm.category" :items="categoryOptions" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Vendor</label>
            <UInput v-model="editForm.vendor" placeholder="e.g. Google, Microsoft" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Owner Team</label>
            <USelect v-model="editForm.ownerTeam" :items="teamOptions" placeholder="No owner team" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Last Reviewed</label>
            <UInput v-model="editForm.lastReviewed" type="date" />
          </div>
          <UAlert
            v-if="editError"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-circle"
            :description="editError"
            class="mt-2"
          />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="outline" @click="editModalOpen = false" />
          <UButton
            :loading="editLoading"
            :label="editLoading ? 'Saving...' : 'Save'"
            @click="confirmEdit"
          />
        </div>
      </template>
    </UModal>

    <!-- Create Version Constraint Modal -->
    <UModal v-model:open="vcModalOpen">
      <template #header>
        <h3 class="text-lg font-semibold">Create Version Constraint for {{ vcForm.governsTechnology }}</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Name *</label>
            <UInput v-model="vcForm.name" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Description</label>
            <UInput v-model="vcForm.description" placeholder="What does this constraint enforce?" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Severity *</label>
            <USelect v-model="vcForm.severity" :items="vcSeverityOptions" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Version Range *</label>
            <UInput v-model="vcForm.versionRange" placeholder="e.g. >=18.0.0 <20.0.0" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Scope *</label>
              <USelect
                v-model="vcForm.scope"
                :items="isSuperuser ? ['organization', 'team'] : ['team']"
              />
            </div>
            <div v-if="vcForm.scope === 'team'">
              <label class="block text-sm font-medium mb-1">Team *</label>
              <USelect
                v-model="vcForm.subjectTeam"
                :items="isSuperuser ? teamOptions : userTeams"
                placeholder="Select team"
              />
            </div>
          </div>
          <UAlert
            v-if="vcError"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-circle"
            :description="vcError"
            class="mt-2"
          />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="outline" @click="vcModalOpen = false" />
          <UButton
            :loading="vcLoading"
            :label="vcLoading ? 'Creating...' : 'Create'"
            @click="confirmCreateVC"
          />
        </div>
      </template>
    </UModal>

    <!-- Delete Technology Modal -->
    <UModal v-model:open="deleteModalOpen">
      <template #header>
        <h3 class="text-lg font-semibold">Delete Technology</h3>
      </template>
      <template #body>
        <p>
          Are you sure you want to delete <strong>{{ deleteTarget }}</strong>?
          This will remove the technology and all its relationships.
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
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="outline" @click="deleteModalOpen = false" />
          <UButton
            label="Delete"
            color="error"
            :loading="deleteLoading"
            @click="confirmDelete"
          />
        </div>
      </template>
    </UModal>

    <!-- Set TIME Modal -->
    <UModal v-model:open="timeModalOpen">
      <template #header>
        <h3 class="text-lg font-semibold">Set TIME: {{ timeModalTech?.name }}</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Team *</label>
            <UInput
              v-if="timeTeamReadonly"
              :model-value="timeForm.teamName"
              disabled
            />
            <USelect
              v-else
              v-model="timeForm.teamName"
              :items="timeTeamOptions"
              placeholder="Select team"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">TIME Value *</label>
            <USelect
              v-model="timeForm.time"
              :items="timeOptions"
              placeholder="Select TIME value"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Notes</label>
            <UTextarea v-model="timeForm.notes" placeholder="Optional notes" />
          </div>
          <UAlert
            v-if="timeError"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-circle"
            :description="timeError"
            class="mt-2"
          />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="outline" type="button" @click="timeModalOpen = false" />
          <UButton
            :loading="timeLoading"
            :label="timeLoading ? 'Saving...' : 'Save'"
            :disabled="!timeForm.teamName || !timeForm.time"
            @click="confirmSetTime"
          />
        </div>
      </template>
    </UModal>

    <!-- Link Component Modal -->
    <UModal v-model:open="linkModalOpen">
      <template #header>
        <h3 class="text-lg font-semibold">Link Component to {{ linkTechName }}</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Search Components</label>
            <UInput
              v-model="linkSearch"
              placeholder="Type at least 2 characters to search..."
              icon="i-lucide-search"
            />
          </div>
          <div v-if="linkSearching" class="text-sm text-(--ui-text-muted)">
            Searching...
          </div>
          <div v-else-if="linkSearch.length >= 2 && linkSearchResults.length === 0" class="text-sm text-(--ui-text-muted)">
            No unmapped components found.
          </div>
          <div v-if="linkSearchResults.length > 0" class="max-h-60 overflow-y-auto border border-(--ui-border) rounded-md divide-y divide-(--ui-border)">
            <button
              v-for="comp in linkSearchResults"
              :key="`${comp.name}@${comp.version}`"
              type="button"
              class="w-full text-left px-3 py-2 hover:bg-(--ui-bg-elevated) transition-colors"
              :class="{ 'bg-(--ui-bg-elevated)': linkSelected?.name === comp.name && linkSelected?.version === comp.version }"
              @click="linkSelected = { name: comp.name, version: comp.version }"
            >
              <span class="font-medium">{{ comp.name }}</span>
              <code class="ml-2 text-sm">{{ comp.version }}</code>
            </button>
          </div>
          <div v-if="linkSelected" class="text-sm">
            Selected: <strong>{{ linkSelected.name }}</strong> <code>{{ linkSelected.version }}</code>
          </div>
          <UAlert
            v-if="linkError"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-circle"
            :description="linkError"
          />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="outline" type="button" @click="linkModalOpen = false" />
          <UButton
            :loading="linkLoading"
            :label="linkLoading ? 'Linking...' : 'Link Component'"
            :disabled="!linkSelected"
            @click="confirmLinkComponent"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse, Technology } from '~~/types/api'

const { getSortableHeader } = useSortableTable()
const { data: session } = useAuth()
const { isSuperuser } = useEffectiveRole()

const userTeams = computed(() =>
  (session.value?.user?.teams as { name: string }[] | undefined)?.map(t => t.name) || []
)

function canManageTechnology(tech: Technology): boolean {
  if (isSuperuser.value) return true
  if (!tech.ownerTeamName) return false
  return userTeams.value.includes(tech.ownerTeamName)
}

const columns: TableColumn<Technology>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => getSortableHeader(column, 'Name'),
    cell: ({ row }) => {
      return h(resolveComponent('NuxtLink'), {
        to: `/technologies/${encodeURIComponent(row.original.name)}`,
        class: 'font-medium hover:underline'
      }, () => row.original.name)
    }
  },
  {
    accessorKey: 'category',
    header: ({ column }) => getSortableHeader(column, 'Category'),
    cell: ({ row }) => {
      const category = row.getValue('category') as string | undefined
      if (!category) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(resolveComponent('UBadge'), { color: 'neutral', variant: 'subtle' }, () => category)
    }
  },
  {
    accessorKey: 'componentCount',
    header: ({ column }) => getSortableHeader(column, 'Components'),
    cell: ({ row }) => {
      const count = row.original.componentCount
      if (!count) return h('span', { class: 'text-(--ui-text-muted)' }, '0')
      return String(count)
    }
  },
  {
    accessorKey: 'constraintCount',
    header: ({ column }) => getSortableHeader(column, 'Policies'),
    cell: ({ row }) => {
      const count = row.original.constraintCount
      if (!count) return h('span', { class: 'text-(--ui-text-muted)' }, '0')
      return String(count)
    }
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    meta: { class: { th: 'w-10', td: 'text-right' } },
    cell: ({ row }) => {
      const tech = row.original
      const viewGroup = [
        { label: 'View Details', icon: 'i-lucide-eye', onSelect: () => navigateTo(`/technologies/${encodeURIComponent(tech.name)}`) }
      ]
      const items: { label: string; icon: string; onSelect: () => void }[][] = [viewGroup]

      if (canSetTime.value) {
        items.push([
          { label: 'Set TIME', icon: 'i-lucide-clock', onSelect: () => openTimeModal(tech) }
        ])
      }

      // Any authenticated user can create a version constraint for a technology
      if (session.value?.user) {
        items.push([
          { label: 'Create Version Constraint', icon: 'i-lucide-shield', onSelect: () => openCreateVCModal(tech) }
        ])
      }

      if (tech.componentCount === 0 && session.value?.user) {
        items.push([
          { label: 'Link Component', icon: 'i-lucide-link', onSelect: () => openLinkComponentModal(tech) }
        ])
      }

      if (canManageTechnology(tech)) {
        items.push([
          { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => openEditModal(tech) }
        ])
      }

      if (canManageTechnology(tech)) {
        items.push([
          { label: 'Delete', icon: 'i-lucide-trash-2', onSelect: () => openDeleteModal(tech.name) }
        ])
      }

      return h(resolveComponent('UDropdownMenu'), { items, content: { align: 'end' } }, {
        default: () => h(resolveComponent('UButton'), { icon: 'i-lucide-ellipsis-vertical', color: 'neutral', variant: 'ghost', size: 'sm' })
      })
    }
  }
]

// Edit modal state
const editModalOpen = ref(false)
const editLoading = ref(false)
const editError = ref('')
const editForm = ref<{
  name: string
  category: string
  vendor: string
  ownerTeam: string | undefined
  lastReviewed: string
}>({
  name: '',
  category: '',
  vendor: '',
  ownerTeam: undefined,
  lastReviewed: ''
})

const categoryOptions = ['language', 'framework', 'library', 'database', 'cache', 'container', 'platform', 'tool', 'runtime', 'other']

interface TeamsResponse { success: boolean; data: { name: string }[]; count: number }
const { data: teamsData } = useLazyFetch<TeamsResponse>('/api/teams', { key: 'tech-edit-teams' })
const teamOptions = computed(() =>
  (teamsData.value?.data || []).map(t => t.name).sort()
)

function openEditModal(tech: Technology) {
  editForm.value = {
    name: tech.name,
    category: tech.category || '',
    vendor: tech.vendor || '',
    ownerTeam: tech.ownerTeamName || undefined,
    lastReviewed: tech.lastReviewed || ''
  }
  editError.value = ''
  editModalOpen.value = true
}

async function confirmEdit() {
  editLoading.value = true
  editError.value = ''

  try {
    await $fetch(`/api/technologies/${encodeURIComponent(editForm.value.name)}`, {
      method: 'PUT',
      body: {
        category: editForm.value.category,
        vendor: editForm.value.vendor || null,
        ownerTeam: editForm.value.ownerTeam || null,
        lastReviewed: editForm.value.lastReviewed || null
      }
    })
    editModalOpen.value = false
    await refreshNuxtData()
  } catch (err: unknown) {
    const error = err as { data?: { message?: string }; message?: string }
    editError.value = error.data?.message || error.message || 'Failed to update technology'
  } finally {
    editLoading.value = false
  }
}

// Create Version Constraint modal state
const vcModalOpen = ref(false)
const vcLoading = ref(false)
const vcError = ref('')
const vcForm = ref({
  name: '',
  description: '',
  severity: 'error' as string | undefined,
  scope: 'team',
  subjectTeam: undefined as string | undefined,
  versionRange: '',
  governsTechnology: ''
})
const vcSeverityOptions = ['critical', 'error', 'warning', 'info']

function openCreateVCModal(tech: Technology) {
  const defaultName = `${tech.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-version-constraint`
  vcForm.value = {
    name: defaultName,
    description: '',
    severity: 'error',
    scope: isSuperuser.value ? 'organization' : 'team',
    subjectTeam: isSuperuser.value ? undefined : (userTeams.value[0] || undefined),
    versionRange: '',
    governsTechnology: tech.name
  }
  vcError.value = ''
  vcModalOpen.value = true
}

async function confirmCreateVC() {
  vcLoading.value = true
  vcError.value = ''

  try {
    await $fetch('/api/version-constraints', {
      method: 'POST',
      body: {
        name: vcForm.value.name,
        description: vcForm.value.description || undefined,
        severity: vcForm.value.severity,
        scope: vcForm.value.scope,
        subjectTeam: vcForm.value.scope === 'team' ? vcForm.value.subjectTeam : undefined,
        versionRange: vcForm.value.versionRange,
        governsTechnology: vcForm.value.governsTechnology
      }
    })
    vcModalOpen.value = false
  } catch (err: unknown) {
    const error = err as { data?: { message?: string }; message?: string }
    vcError.value = error.data?.message || error.message || 'Failed to create version constraint'
  } finally {
    vcLoading.value = false
  }
}

// Delete modal state
const deleteModalOpen = ref(false)
const deleteTarget = ref('')
const deleteLoading = ref(false)
const deleteError = ref('')

function openDeleteModal(name: string) {
  deleteTarget.value = name
  deleteError.value = ''
  deleteModalOpen.value = true
}

async function confirmDelete() {
  deleteLoading.value = true
  deleteError.value = ''

  try {
    await $fetch(`/api/technologies/${encodeURIComponent(deleteTarget.value)}`, {
      method: 'DELETE'
    })
    deleteModalOpen.value = false
    await refreshNuxtData()
  } catch (err: unknown) {
    const error = err as { data?: { message?: string }; message?: string }
    deleteError.value = error.data?.message || error.message || 'Failed to delete technology'
  } finally {
    deleteLoading.value = false
  }
}

// Set TIME modal state
const timeModalOpen = ref(false)
const timeLoading = ref(false)
const timeError = ref('')
const timeModalTech = ref<Technology | null>(null)
const timeForm = ref({
  teamName: undefined as string | undefined,
  time: undefined as string | undefined,
  notes: ''
})
const timeOptions = ['invest', 'tolerate', 'migrate', 'eliminate']

const canSetTime = computed(() => isSuperuser.value || userTeams.value.length > 0)

const timeTeamOptions = computed(() =>
  isSuperuser.value ? teamOptions.value : userTeams.value
)

const timeTeamReadonly = computed(() =>
  !isSuperuser.value && userTeams.value.length === 1
)

function openTimeModal(tech: Technology) {
  timeModalTech.value = tech
  const defaultTeam = isSuperuser.value
    ? undefined
    : (userTeams.value.length === 1 ? userTeams.value[0] : undefined)

  // Pre-fill TIME value if the default team already has an approval
  const existingApproval = defaultTeam
    ? tech.approvals?.find(a => a.team === defaultTeam)
    : undefined

  timeForm.value = {
    teamName: defaultTeam,
    time: existingApproval?.time || undefined,
    notes: existingApproval?.notes || ''
  }
  timeError.value = ''
  timeModalOpen.value = true
}

// When team selection changes, pre-fill the existing TIME value
watch(() => timeForm.value.teamName, (newTeam) => {
  if (!newTeam || !timeModalTech.value) return
  const existing = timeModalTech.value.approvals?.find(a => a.team === newTeam)
  timeForm.value.time = existing?.time || undefined
  timeForm.value.notes = existing?.notes || ''
})

async function confirmSetTime() {
  if (!timeModalTech.value || !timeForm.value.teamName || !timeForm.value.time) return
  timeLoading.value = true
  timeError.value = ''

  try {
    await $fetch(`/api/technologies/${encodeURIComponent(timeModalTech.value.name)}/approvals`, {
      method: 'POST',
      body: {
        teamName: timeForm.value.teamName,
        time: timeForm.value.time,
        notes: timeForm.value.notes || undefined
      }
    })
    timeModalOpen.value = false
    await refreshNuxtData()
  } catch (err: unknown) {
    const error = err as { data?: { message?: string }; message?: string }
    timeError.value = error.data?.message || error.message || 'Failed to set TIME value'
  } finally {
    timeLoading.value = false
  }
}

// Link Component modal state
const linkModalOpen = ref(false)
const linkLoading = ref(false)
const linkError = ref('')
const linkTechName = ref('')
const linkSearch = ref('')
const linkSearchResults = ref<{ name: string; version: string; purl?: string }[]>([])
const linkSearching = ref(false)
const linkSelected = ref<{ name: string; version: string } | null>(null)

function openLinkComponentModal(tech: Technology) {
  linkTechName.value = tech.name
  linkSearch.value = ''
  linkSearchResults.value = []
  linkSelected.value = null
  linkError.value = ''
  linkModalOpen.value = true
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(linkSearch, (val) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  linkSelected.value = null
  if (!val || val.length < 2) {
    linkSearchResults.value = []
    return
  }
  searchTimeout = setTimeout(async () => {
    linkSearching.value = true
    try {
      const res = await $fetch<{ data: { name: string; version: string; purl?: string; technologyName?: string }[] }>('/api/components', {
        query: { search: val, limit: 20 }
      })
      // Only show components not already linked to a technology
      linkSearchResults.value = (res.data || []).filter(c => !c.technologyName)
    } catch {
      linkSearchResults.value = []
    } finally {
      linkSearching.value = false
    }
  }, 300)
})

async function confirmLinkComponent() {
  if (!linkSelected.value) return
  linkLoading.value = true
  linkError.value = ''

  try {
    await $fetch(`/api/technologies/${encodeURIComponent(linkTechName.value)}/components`, {
      method: 'POST',
      body: {
        componentName: linkSelected.value.name,
        componentVersion: linkSelected.value.version
      }
    })
    linkModalOpen.value = false
    await refreshNuxtData()
  } catch (err: unknown) {
    const error = err as { data?: { message?: string }; message?: string }
    linkError.value = error.data?.message || error.message || 'Failed to link component'
  } finally {
    linkLoading.value = false
  }
}

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

const { data, pending, error } = await useFetch<ApiResponse<Technology>>('/api/technologies', { query: queryParams })

const technologies = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

useHead({ title: 'Technologies - Polaris' })
</script>
