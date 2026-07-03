<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <UPageHeader
        title="Version Constraints"
        description="Rules governing allowed technology versions"
      />
      <UButton
        v-if="isSuperuser"
        label="+ Create"
        @click="showCreateModal = true"
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
      <PaginatedTable
        v-model:sorting="sorting"
        v-model:page="page"
        :manual-sorting="true"
        :data="constraints"
        :columns="columns"
        :loading="pending"
        :total="total"
        :page-size="pageSize"
      >
        <template #empty>
          <div class="text-center text-(--ui-text-muted) py-12">
            No version constraints found.
          </div>
        </template>
      </PaginatedTable>
    </template>

    <!-- Create Modal -->
    <UModal v-model:open="showCreateModal">
      <template #header>
        <h3 class="text-lg font-semibold">Create Version Constraint</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Name *</label>
            <UInput v-model="createForm.name" placeholder="e.g. react-min-version" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Description</label>
            <UTextarea v-model="createForm.description" placeholder="What does this constraint enforce?" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Severity *</label>
              <USelect v-model="createForm.severity" :items="severityOptions" placeholder="Select severity" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Scope *</label>
              <USelect v-model="createForm.scope" :items="scopeOptions" />
            </div>
          </div>
          <div v-if="createForm.scope === 'team'">
            <label class="block text-sm font-medium mb-1">Subject Team *</label>
            <USelect v-model="createForm.subjectTeam" :items="teamOptions" placeholder="Select team" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Version Range *</label>
            <UInput v-model="createForm.versionRange" placeholder="e.g. >=18.0.0 <20.0.0" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Governs Technology</label>
            <USelect v-model="createForm.governsTechnology" :items="technologyOptions" placeholder="Select technology" />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="outline" type="button" @click="showCreateModal = false" />
          <UButton
            :loading="isCreating"
            :label="isCreating ? 'Creating...' : 'Create'"
            @click="handleCreate"
          />
        </div>
      </template>
    </UModal>

    <!-- Edit Modal -->
    <UModal v-model:open="showEditModal">
      <template #header>
        <h3 class="text-lg font-semibold">Edit Version Constraint</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Name</label>
            <UInput :model-value="editForm.name" disabled />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Description</label>
            <UTextarea v-model="editForm.description" placeholder="Description" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Severity *</label>
              <USelect v-model="editForm.severity" :items="severityOptions" placeholder="Select severity" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Scope *</label>
              <USelect v-model="editForm.scope" :items="editScopeOptions" />
            </div>
          </div>
          <div v-if="editForm.scope === 'team'">
            <label class="block text-sm font-medium mb-1">Subject Team *</label>
            <USelect v-model="editForm.subjectTeam" :items="teamOptions" placeholder="Select team" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Version Range *</label>
            <UInput v-model="editForm.versionRange" placeholder="e.g. >=18.0.0 <20.0.0" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Governs Technology</label>
            <USelect v-model="editForm.governsTechnology" :items="technologyOptions" placeholder="Select technology" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Status</label>
            <USelect v-model="editForm.status" :items="statusOptions" />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="outline" type="button" @click="showEditModal = false" />
          <UButton
            :loading="isEditing"
            :label="isEditing ? 'Saving...' : 'Save'"
            @click="handleEdit"
          />
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #header>
        <h3 class="text-lg font-semibold">Delete Version Constraint</h3>
      </template>
      <template #body>
        <p>Are you sure you want to delete <strong>{{ deleteTarget }}</strong>?</p>
        <p class="text-sm text-(--ui-text-muted) mt-2">This action cannot be undone.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="outline" type="button" @click="showDeleteModal = false" />
          <UButton
            :label="isDeleting ? 'Deleting...' : 'Delete'"
            color="error"
            :loading="isDeleting"
            @click="confirmDelete"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse } from '~~/types/api'

const { data: session } = useAuth()
const { isSuperuser } = useEffectiveRole()
const { getSortableHeader } = useSortableTable()
const toast = useToast()

interface VersionConstraint {
  name: string
  description: string | null
  severity: string
  scope: string
  subjectTeam: string | null
  versionRange: string | null
  status: string
  subjectTeams: string[]
  governedTechnologies: string[]
  technologyCount: number
}

const userTeams = computed(() =>
  (session.value?.user?.teams as { name: string }[] | undefined)?.map(t => t.name) || []
)

function canEdit(vc: VersionConstraint): boolean {
  if (isSuperuser.value) return true
  if (vc.scope === 'team' && vc.subjectTeam) {
    return userTeams.value.includes(vc.subjectTeam)
  }
  return false
}

const columns: TableColumn<VersionConstraint>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => getSortableHeader(column, 'Name'),
    cell: ({ row }) => {
      const vc = row.original
      return h('div', {}, [
        h('strong', {}, vc.name),
        vc.description ? h('p', { class: 'text-sm text-(--ui-text-muted)' }, vc.description) : null
      ].filter(Boolean))
    }
  },
  {
    accessorKey: 'severity',
    header: ({ column }) => getSortableHeader(column, 'Severity'),
    cell: ({ row }) => {
      const severity = row.getValue('severity') as string | undefined
      if (!severity) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(resolveComponent('UBadge'), { color: getSeverityColor(severity), variant: 'subtle' }, () => severity)
    }
  },
  {
    accessorKey: 'versionRange',
    header: 'Version Range',
    cell: ({ row }) => {
      const range = row.getValue('versionRange') as string | undefined
      if (!range) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h('code', {}, range)
    }
  },
  {
    accessorKey: 'scope',
    header: ({ column }) => getSortableHeader(column, 'Scope'),
    cell: ({ row }) => {
      const vc = row.original
      if (!vc.scope) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      if (vc.scope === 'team' && vc.subjectTeam) {
        return h('span', {}, ['team: ', h('strong', {}, vc.subjectTeam)])
      }
      return vc.scope
    }
  },
  {
    accessorKey: 'status',
    header: ({ column }) => getSortableHeader(column, 'Status'),
    cell: ({ row }) => {
      const status = row.getValue('status') as string | undefined
      if (!status) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(resolveComponent('UBadge'), { color: status === 'active' ? 'success' : 'neutral', variant: 'subtle' }, () => status)
    }
  },
  {
    id: 'actions',
    header: '',
    meta: { class: { th: 'w-10', td: 'text-right' } },
    cell: ({ row }) => {
      const vc = row.original
      const isActive = vc.status === 'active'
      const editable = canEdit(vc)
      const items = [[
        {
          label: 'View Details',
          icon: 'i-lucide-eye',
          onSelect: () => navigateTo(`/version-constraints/${encodeURIComponent(vc.name)}`)
        },
        ...(editable ? [{
          label: 'Edit',
          icon: 'i-lucide-pencil',
          onSelect: () => openEditModal(vc)
        }] : []),
        ...(isSuperuser.value ? [
          {
            label: isActive ? 'Disable' : 'Enable',
            icon: isActive ? 'i-lucide-pause' : 'i-lucide-play',
            onSelect: () => toggleStatus(vc.name, isActive ? 'disabled' : 'active')
          },
          {
            label: 'Delete',
            icon: 'i-lucide-trash-2',
            onSelect: () => openDeleteModal(vc.name)
          }
        ] : [])
      ]]

      return h(resolveComponent('UDropdownMenu'), { items, content: { align: 'end' } }, {
        default: () => h(resolveComponent('UButton'), { icon: 'i-lucide-ellipsis-vertical', color: 'neutral', variant: 'ghost', size: 'sm' })
      })
    }
  }
]

const { sorting, page, pageSize, offset, sortBy, sortOrder } = usePaginatedSorting()

const { data, pending, error } = await useFetch<ApiResponse<VersionConstraint>>('/api/version-constraints', {
  query: { limit: pageSize, offset, sortBy, sortOrder }
})

const constraints = useApiData(data)
const total = useApiCount(data)

// Create modal
const showCreateModal = ref(false)
const isCreating = ref(false)
const createForm = ref({
  name: '',
  description: '',
  severity: undefined as string | undefined,
  scope: 'organization',
  subjectTeam: undefined as string | undefined,
  versionRange: '',
  governsTechnology: undefined as string | undefined
})
const severityOptions = ['critical', 'error', 'warning', 'info']
const scopeOptions = ['organization', 'team']
const statusOptions = ['active', 'draft', 'archived']

const editScopeOptions = computed(() =>
  isSuperuser.value ? ['organization', 'team'] : ['team']
)

interface TeamsResponse { success: boolean; data: { name: string }[] }
const { data: teamsData } = useLazyFetch<TeamsResponse>('/api/teams', { key: 'vc-teams' })
const teamOptions = computed(() =>
  (teamsData.value?.data || []).map(t => t.name).sort()
)

interface TechResponse { success: boolean; data: { name: string }[] }
const { data: techData } = useLazyFetch<TechResponse>('/api/technologies', { key: 'vc-techs' })
const technologyOptions = computed(() =>
  (techData.value?.data || []).map(t => t.name).sort()
)

async function handleCreate() {
  isCreating.value = true
  try {
    await $fetch('/api/version-constraints', {
      method: 'POST',
      body: {
        name: createForm.value.name,
        description: createForm.value.description || undefined,
        severity: createForm.value.severity,
        scope: createForm.value.scope,
        subjectTeam: createForm.value.scope === 'team' ? createForm.value.subjectTeam : undefined,
        versionRange: createForm.value.versionRange,
        governsTechnology: createForm.value.governsTechnology || undefined
      }
    })
    showCreateModal.value = false
    createForm.value = { name: '', description: '', severity: undefined, scope: 'organization', subjectTeam: undefined, versionRange: '', governsTechnology: undefined }
    await refreshNuxtData()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    toast.add({ title: 'Error', description: err.data?.message || err.message || 'Failed to create version constraint', color: 'error' })
  } finally {
    isCreating.value = false
  }
}

// Edit modal
const showEditModal = ref(false)
const isEditing = ref(false)
const editForm = ref({
  name: '',
  description: '',
  severity: undefined as string | undefined,
  scope: 'organization',
  subjectTeam: undefined as string | undefined,
  versionRange: '',
  governsTechnology: undefined as string | undefined,
  status: undefined as string | undefined
})

function openEditModal(vc: VersionConstraint) {
  editForm.value = {
    name: vc.name,
    description: vc.description || '',
    severity: vc.severity || undefined,
    scope: vc.scope || 'organization',
    subjectTeam: vc.subjectTeam || undefined,
    versionRange: vc.versionRange || '',
    governsTechnology: vc.governedTechnologies?.[0] || undefined,
    status: vc.status || undefined
  }
  showEditModal.value = true
}

async function handleEdit() {
  isEditing.value = true
  try {
    await $fetch(`/api/version-constraints/${encodeURIComponent(editForm.value.name)}`, {
      method: 'PUT',
      body: {
        description: editForm.value.description || undefined,
        severity: editForm.value.severity,
        scope: editForm.value.scope,
        subjectTeam: editForm.value.scope === 'team' ? editForm.value.subjectTeam : undefined,
        versionRange: editForm.value.versionRange,
        governsTechnology: editForm.value.governsTechnology || undefined,
        status: editForm.value.status
      }
    })
    showEditModal.value = false
    await refreshNuxtData()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    toast.add({ title: 'Error', description: err.data?.message || err.message || 'Failed to update version constraint', color: 'error' })
  } finally {
    isEditing.value = false
  }
}

// Toggle status
async function toggleStatus(name: string, newStatus: string) {
  try {
    await $fetch(`/api/version-constraints/${encodeURIComponent(name)}`, {
      method: 'PATCH',
      body: { status: newStatus }
    })
    await refreshNuxtData()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    toast.add({ title: 'Error', description: err.data?.message || err.message || 'Failed to update status', color: 'error' })
  }
}

// Delete modal
const showDeleteModal = ref(false)
const deleteTarget = ref('')
const isDeleting = ref(false)

function openDeleteModal(name: string) {
  deleteTarget.value = name
  showDeleteModal.value = true
}

async function confirmDelete() {
  isDeleting.value = true
  try {
    await $fetch(`/api/version-constraints/${encodeURIComponent(deleteTarget.value)}`, { method: 'DELETE' })
    showDeleteModal.value = false
    await refreshNuxtData()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    toast.add({ title: 'Error', description: err.data?.message || err.message || 'Failed to delete version constraint', color: 'error' })
  } finally {
    isDeleting.value = false
  }
}

useHead({ title: 'Version Constraints - Polaris' })
</script>
