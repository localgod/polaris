<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <UPageHeader
        title="Policies"
        description="Governance and compliance rules"
      />
      <UButton
        v-if="isSuperuser"
        label="+ Create Policy"
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
      <UCard>
        <UTable
          v-model:sorting="sorting"
          :manual-sorting="true"
          :data="policies"
          :columns="columns"
          :loading="pending"
          class="flex-1"
        >
          <template #empty>
            <div class="text-center text-(--ui-text-muted) py-12">
              No policies found.
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

    <!-- Create Policy Modal -->
    <UModal v-model:open="showCreateModal">
      <template #header>
        <h3 class="text-lg font-semibold">Create Policy</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Name *</label>
            <UInput v-model="createForm.name" placeholder="e.g. no-deprecated-technologies" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Description</label>
            <UTextarea v-model="createForm.description" placeholder="Policy description" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Rule Type *</label>
              <USelect v-model="createForm.ruleType" :items="ruleTypeOptions" placeholder="Select rule type" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Severity *</label>
              <USelect v-model="createForm.severity" :items="severityOptions" placeholder="Select severity" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Scope *</label>
              <USelect v-model="createForm.scope" :items="scopeOptions" />
            </div>
            <div v-if="createForm.scope === 'team'">
              <label class="block text-sm font-medium mb-1">Subject Team *</label>
              <USelect v-model="createForm.subjectTeam" :items="teamOptions" placeholder="Select team" />
            </div>
          </div>
          <div v-if="createForm.ruleType === 'version-constraint'">
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
          <UButton label="Cancel" color="neutral" variant="outline" @click="showCreateModal = false" />
          <UButton
            :loading="isCreating"
            :label="isCreating ? 'Creating...' : 'Create'"
            @click="handleCreatePolicy"
          />
        </div>
      </template>
    </UModal>

    <!-- Edit Policy Modal -->
    <UModal v-model:open="showEditModal">
      <template #header>
        <h3 class="text-lg font-semibold">Edit Policy</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-1">Name</label>
            <UInput :model-value="editForm.name" disabled />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Description</label>
            <UTextarea v-model="editForm.description" placeholder="Policy description" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Rule Type *</label>
              <USelect v-model="editForm.ruleType" :items="ruleTypeOptions" placeholder="Select rule type" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Severity *</label>
              <USelect v-model="editForm.severity" :items="severityOptions" placeholder="Select severity" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Scope *</label>
              <USelect v-model="editForm.scope" :items="editScopeOptions" />
            </div>
            <div v-if="editForm.scope === 'team'">
              <label class="block text-sm font-medium mb-1">Subject Team *</label>
              <USelect v-model="editForm.subjectTeam" :items="teamOptions" placeholder="Select team" />
            </div>
          </div>
          <div v-if="editForm.ruleType === 'version-constraint'">
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
            @click="handleEditPolicy"
          />
        </div>
      </template>
    </UModal>

    <!-- Delete Policy Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #header>
        <h3 class="text-lg font-semibold">Delete Policy</h3>
      </template>
      <template #body>
        <p>Are you sure you want to delete <strong>{{ deleteTarget }}</strong>?</p>
        <p class="text-sm text-(--ui-text-muted) mt-2">This action cannot be undone.</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="outline" @click="showDeleteModal = false" />
          <UButton
            :label="isDeleting ? 'Deleting...' : 'Delete'"
            color="error"
            :loading="isDeleting"
            @click="confirmDeletePolicy"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse, Policy } from '~~/types/api'

const { data: session } = useAuth()
const { isSuperuser } = useEffectiveRole()
const { getSortableHeader } = useSortableTable()

const userTeams = computed(() =>
  (session.value?.user?.teams as { name: string }[] | undefined)?.map(t => t.name) || []
)

function canEditPolicy(policy: Policy): boolean {
  if (isSuperuser.value) return true
  if (policy.scope === 'team' && policy.subjectTeam) {
    return userTeams.value.includes(policy.subjectTeam)
  }
  return false
}

function getSeverityColor(severity: string): 'error' | 'warning' | 'success' | 'neutral' {
  const colors: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error',
    error: 'error',
    warning: 'warning',
    info: 'neutral'
  }
  return colors[severity] || 'neutral'
}

const columns: TableColumn<Policy>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => getSortableHeader(column, 'Name'),
    cell: ({ row }) => {
      const policy = row.original
      return h('div', {}, [
        h('strong', {}, policy.name),
        policy.description ? h('p', { class: 'text-sm text-(--ui-text-muted)' }, policy.description) : null
      ].filter(Boolean))
    }
  },
  {
    accessorKey: 'ruleType',
    header: ({ column }) => getSortableHeader(column, 'Type'),
    cell: ({ row }) => {
      const ruleType = row.getValue('ruleType') as string | undefined
      if (!ruleType) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return ruleType
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
    accessorKey: 'scope',
    header: ({ column }) => getSortableHeader(column, 'Scope'),
    cell: ({ row }) => {
      const policy = row.original
      if (!policy.scope) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      if (policy.scope === 'team' && policy.subjectTeam) {
        return h('span', {}, [
          'team: ',
          h('strong', {}, policy.subjectTeam)
        ])
      }
      return policy.scope
    }
  },
  {
    accessorKey: 'enforcedBy',
    header: ({ column }) => getSortableHeader(column, 'Enforced By'),
    cell: ({ row }) => {
      const enforcedBy = row.getValue('enforcedBy') as string | undefined
      if (!enforcedBy) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return enforcedBy
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
    meta: {
      class: {
        th: 'w-10',
        td: 'text-right'
      }
    },
    cell: ({ row }) => {
      const policy = row.original

      const isActive = policy.status === 'active'
      const editable = canEditPolicy(policy)
      const items = [
        [
          {
            label: 'View Details',
            icon: 'i-lucide-eye',
            onSelect: () => navigateTo(`/policies/${encodeURIComponent(policy.name)}`)
          },
          ...(editable ? [
            {
              label: 'Edit',
              icon: 'i-lucide-pencil',
              onSelect: () => openEditModal(policy)
            }
          ] : []),
          ...(isSuperuser.value ? [
            {
              label: isActive ? 'Disable' : 'Enable',
              icon: isActive ? 'i-lucide-pause' : 'i-lucide-play',
              onSelect: () => togglePolicyStatus(policy.name, isActive ? 'disabled' : 'active')
            },
            {
              label: 'Delete',
              icon: 'i-lucide-trash-2',
              onSelect: () => openDeleteModal(policy.name)
            }
          ] : [])
        ]
      ]

      return h(resolveComponent('UDropdownMenu'), {
        items,
        content: { align: 'end' }
      }, {
        default: () => h(resolveComponent('UButton'), {
          icon: 'i-lucide-ellipsis-vertical',
          color: 'neutral',
          variant: 'ghost',
          size: 'sm'
        })
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

const { data, pending, error } = await useFetch<ApiResponse<Policy>>('/api/policies', {
  query: queryParams
})

const policies = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

// Create policy modal
const showCreateModal = ref(false)
const isCreating = ref(false)
const createForm = ref({
  name: '',
  description: '',
  ruleType: undefined as string | undefined,
  severity: undefined as string | undefined,
  scope: 'organization',
  subjectTeam: undefined as string | undefined,
  versionRange: '',
  governsTechnology: undefined as string | undefined
})
const ruleTypeOptions = ['license-compliance', 'version-constraint']
const severityOptions = ['critical', 'error', 'warning', 'info']
const scopeOptions = ['organization', 'team']
const statusOptions = ['active', 'draft', 'archived']

const editScopeOptions = computed(() =>
  isSuperuser.value ? ['organization', 'team'] : ['team']
)

interface TeamsResponse { success: boolean; data: { name: string }[] }
const { data: teamsData } = useLazyFetch<TeamsResponse>('/api/teams', { key: 'policy-teams' })
const teamOptions = computed(() =>
  (teamsData.value?.data || []).map(t => t.name).sort()
)

interface TechResponse { success: boolean; data: { name: string }[] }
const { data: techData } = useLazyFetch<TechResponse>('/api/technologies', { key: 'policy-techs' })
const technologyOptions = computed(() =>
  (techData.value?.data || []).map(t => t.name).sort()
)

async function handleCreatePolicy() {
  isCreating.value = true
  try {
    await $fetch('/api/policies', {
      method: 'POST',
      body: {
        name: createForm.value.name,
        description: createForm.value.description || undefined,
        ruleType: createForm.value.ruleType,
        severity: createForm.value.severity,
        scope: createForm.value.scope,
        subjectTeam: createForm.value.scope === 'team' ? createForm.value.subjectTeam : undefined,
        versionRange: createForm.value.ruleType === 'version-constraint' ? createForm.value.versionRange : undefined,
        governsTechnology: createForm.value.governsTechnology || undefined
      }
    })
    showCreateModal.value = false
    createForm.value = { name: '', description: '', ruleType: undefined, severity: undefined, scope: 'organization', subjectTeam: undefined, versionRange: '', governsTechnology: undefined }
    await refreshNuxtData()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    alert(err.data?.message || err.message || 'Failed to create policy')
  } finally {
    isCreating.value = false
  }
}

// Edit policy modal
const showEditModal = ref(false)
const isEditing = ref(false)
const editForm = ref({
  name: '',
  description: '',
  ruleType: undefined as string | undefined,
  severity: undefined as string | undefined,
  scope: 'organization',
  subjectTeam: undefined as string | undefined,
  versionRange: '',
  governsTechnology: undefined as string | undefined,
  status: undefined as string | undefined
})

function openEditModal(policy: Policy) {
  editForm.value = {
    name: policy.name,
    description: policy.description || '',
    ruleType: policy.ruleType || undefined,
    severity: policy.severity || undefined,
    scope: policy.scope || 'organization',
    subjectTeam: policy.subjectTeam || undefined,
    versionRange: policy.versionRange || '',
    governsTechnology: policy.governedTechnologies?.[0] || undefined,
    status: policy.status || undefined
  }
  showEditModal.value = true
}

async function handleEditPolicy() {
  isEditing.value = true
  try {
    await $fetch(`/api/policies/${encodeURIComponent(editForm.value.name)}`, {
      method: 'PUT',
      body: {
        description: editForm.value.description || undefined,
        ruleType: editForm.value.ruleType,
        severity: editForm.value.severity,
        scope: editForm.value.scope,
        subjectTeam: editForm.value.scope === 'team' ? editForm.value.subjectTeam : undefined,
        versionRange: editForm.value.ruleType === 'version-constraint' ? editForm.value.versionRange : undefined,
        governsTechnology: editForm.value.governsTechnology || undefined,
        status: editForm.value.status
      }
    })
    showEditModal.value = false
    await refreshNuxtData()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    alert(err.data?.message || err.message || 'Failed to update policy')
  } finally {
    isEditing.value = false
  }
}

// Toggle policy status
async function togglePolicyStatus(name: string, newStatus: string) {
  try {
    await $fetch(`/api/policies/${encodeURIComponent(name)}`, {
      method: 'PATCH',
      body: { status: newStatus }
    })
    await refreshNuxtData()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    alert(err.data?.message || err.message || 'Failed to update policy status')
  }
}

// Delete policy modal
const showDeleteModal = ref(false)
const deleteTarget = ref('')
const isDeleting = ref(false)

function openDeleteModal(name: string) {
  deleteTarget.value = name
  showDeleteModal.value = true
}

async function confirmDeletePolicy() {
  isDeleting.value = true
  try {
    await $fetch(`/api/policies/${encodeURIComponent(deleteTarget.value)}`, { method: 'DELETE' })
    showDeleteModal.value = false
    await refreshNuxtData()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    alert(err.data?.message || err.message || 'Failed to delete policy')
  } finally {
    isDeleting.value = false
  }
}

useHead({ title: 'Policies - Polaris' })
</script>
