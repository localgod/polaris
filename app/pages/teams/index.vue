<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <UPageHeader
        title="Teams"
        description="Organizational teams and their technology ownership"
      />
      <UButton
        v-if="isSuperuser"
        label="+ Create Team"
        color="primary"
        @click="openCreateModal"
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
          :data="teams"
          :columns="columns"
          :loading="pending"
          class="flex-1"
        >
          <template #empty>
            <div class="text-center text-(--ui-text-muted) py-12">
              No teams found.
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

    <!-- Create Team Modal -->
    <UModal v-model:open="showCreateModal">
      <template #header>
        <h3 class="text-lg font-semibold">Create Team</h3>
      </template>
      <template #body>
        <form class="space-y-4" @submit.prevent="handleCreate">
          <UFormField label="Team Name" required>
            <UInput
              v-model="createForm.name"
              placeholder="e.g., Platform Team"
            />
          </UFormField>

          <UFormField label="Email">
            <UInput
              v-model="createForm.email"
              type="email"
              placeholder="team@example.com"
            />
          </UFormField>

          <UFormField label="Responsibility Area">
            <UInput
              v-model="createForm.responsibilityArea"
              placeholder="e.g., Infrastructure, Frontend, Data"
            />
          </UFormField>

          <UAlert
            v-if="createError"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-circle"
            :description="createError"
          />

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              @click="showCreateModal = false"
            />
            <UButton
              type="submit"
              :loading="isCreating"
              :label="isCreating ? 'Creating...' : 'Create'"
              color="primary"
              :disabled="!createForm.name"
            />
          </div>
        </form>
      </template>
    </UModal>

    <!-- Edit Team Modal -->
    <UModal v-model:open="showEditModal">
      <template #header>
        <h3 class="text-lg font-semibold">Edit Team</h3>
      </template>
      <template #body>
        <form class="space-y-4" @submit.prevent="handleUpdate">
          <UFormField label="Team Name" required>
            <UInput
              v-model="editForm.name"
              placeholder="Team name"
            />
          </UFormField>

          <UFormField label="Email">
            <UInput
              v-model="editForm.email"
              type="email"
              placeholder="team@example.com"
            />
          </UFormField>

          <UFormField label="Responsibility Area">
            <UInput
              v-model="editForm.responsibilityArea"
              placeholder="e.g., Infrastructure, Frontend, Data"
            />
          </UFormField>

          <UAlert
            v-if="editError"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-circle"
            :description="editError"
          />

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              @click="showEditModal = false"
            />
            <UButton
              type="submit"
              :loading="isUpdating"
              :label="isUpdating ? 'Saving...' : 'Save'"
              color="primary"
            />
          </div>
        </form>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #header>
        <h3 class="text-lg font-semibold">Delete Team</h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <p>
            Are you sure you want to delete <strong>{{ deleteTeamName }}</strong>?
            This action cannot be undone.
          </p>

          <UAlert
            v-if="deleteError"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-circle"
            :description="deleteError"
          />

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              @click="showDeleteModal = false"
            />
            <UButton
              :loading="isDeleting"
              :label="isDeleting ? 'Deleting...' : 'Delete'"
              color="error"
              @click="handleDelete"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse, Team } from '~~/types/api'

const { getSortableHeader } = useSortableTable()
const { isSuperuser } = useEffectiveRole()

const baseColumns: TableColumn<Team>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => getSortableHeader(column, 'Name'),
    cell: ({ row }) => {
      const team = row.original
      return h('div', {}, [
        h(resolveComponent('NuxtLink'), {
          to: `/teams/${encodeURIComponent(team.name)}`,
          class: 'font-medium hover:underline'
        }, () => team.name),
        team.description ? h('p', { class: 'text-sm text-(--ui-text-muted)' }, team.description) : null
      ].filter(Boolean))
    }
  },
  {
    accessorKey: 'responsibilityArea',
    header: ({ column }) => getSortableHeader(column, 'Responsibility Area'),
    cell: ({ row }) => {
      const area = row.getValue('responsibilityArea') as string | undefined
      if (!area) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return area
    }
  },
  {
    accessorKey: 'memberCount',
    header: ({ column }) => getSortableHeader(column, 'Members'),
    cell: ({ row }) => {
      const count = row.getValue('memberCount') as number | undefined
      return String(count ?? 0)
    }
  }
]

const actionsColumn: TableColumn<Team> = {
  id: 'actions',
  header: '',
  meta: {
    class: {
      th: 'w-10',
      td: 'text-right'
    }
  },
  cell: ({ row }) => {
    const team = row.original

    const items = [
      [
        {
          label: 'Edit Team',
          icon: 'i-lucide-pencil',
          onSelect: () => openEditModal(team)
        },
        {
          label: 'Delete Team',
          icon: 'i-lucide-trash-2',
          onSelect: () => openDeleteModal(team.name)
        }
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

const columns = computed(() => {
  if (isSuperuser.value) {
    return [...baseColumns, actionsColumn]
  }
  return baseColumns
})

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

const { data, pending, error } = await useFetch<ApiResponse<Team>>('/api/teams', {
  query: queryParams
})

const teams = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

// --- Create Team ---

const showCreateModal = ref(false)
const isCreating = ref(false)
const createError = ref('')

const createForm = ref({
  name: '',
  email: '',
  responsibilityArea: ''
})

function openCreateModal() {
  createForm.value = { name: '', email: '', responsibilityArea: '' }
  createError.value = ''
  showCreateModal.value = true
}

async function handleCreate() {
  isCreating.value = true
  createError.value = ''

  try {
    const body: Record<string, string> = { name: createForm.value.name }
    if (createForm.value.email) body.email = createForm.value.email
    if (createForm.value.responsibilityArea) body.responsibilityArea = createForm.value.responsibilityArea

    const response = await $fetch<{ success: boolean }>('/api/teams', {
      method: 'POST',
      body
    })

    if (response.success) {
      showCreateModal.value = false
      await refreshNuxtData()
    }
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    createError.value = e.data?.message || e.message || 'Failed to create team'
  } finally {
    isCreating.value = false
  }
}

// --- Edit Team ---

const showEditModal = ref(false)
const isUpdating = ref(false)
const editError = ref('')
const editOriginalName = ref('')

const editForm = ref({
  name: '',
  email: '',
  responsibilityArea: ''
})

function openEditModal(team: Team) {
  editOriginalName.value = team.name
  editForm.value = {
    name: team.name,
    email: (team as Team & { email?: string }).email || '',
    responsibilityArea: team.responsibilityArea || ''
  }
  editError.value = ''
  showEditModal.value = true
}

async function handleUpdate() {
  isUpdating.value = true
  editError.value = ''

  try {
    const body: Record<string, string> = {}
    body.name = editForm.value.name
    if (editForm.value.email !== undefined) body.email = editForm.value.email
    if (editForm.value.responsibilityArea !== undefined) body.responsibilityArea = editForm.value.responsibilityArea

    const response = await $fetch<{ success: boolean }>(`/api/teams/${encodeURIComponent(editOriginalName.value)}`, {
      method: 'PUT',
      body
    })

    if (response.success) {
      showEditModal.value = false
      await refreshNuxtData()
    }
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    editError.value = e.data?.message || e.message || 'Failed to update team'
  } finally {
    isUpdating.value = false
  }
}

// --- Delete Team ---

const showDeleteModal = ref(false)
const isDeleting = ref(false)
const deleteError = ref('')
const deleteTeamName = ref('')

function openDeleteModal(name: string) {
  deleteTeamName.value = name
  deleteError.value = ''
  showDeleteModal.value = true
}

async function handleDelete() {
  isDeleting.value = true
  deleteError.value = ''

  try {
    await $fetch(`/api/teams/${encodeURIComponent(deleteTeamName.value)}`, {
      method: 'DELETE'
    })

    showDeleteModal.value = false
    await refreshNuxtData()
  } catch (err: unknown) {
    const e = err as { data?: { message?: string }; message?: string }
    deleteError.value = e.data?.message || e.message || 'Failed to delete team'
  } finally {
    isDeleting.value = false
  }
}

useHead({ title: 'Teams - Polaris' })
</script>
