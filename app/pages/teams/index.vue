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
      <PaginatedTable
        v-model:sorting="sorting"
        v-model:page="page"
        :manual-sorting="true"
        :data="teams"
        :columns="columns"
        :loading="pending"
        :total="total"
        :page-size="pageSize"
      >
        <template #header>
          <TableSearchHeader v-model="searchInput" />
        </template>
        <template #empty>
          <div class="text-center text-muted py-12">
            No teams found.
          </div>
        </template>
      </PaginatedTable>
    </template>

    <!-- Create Team Modal -->
    <UModal v-model:open="showCreateModal" title="Create Team" :ui="{ footer: 'justify-end' }">
      <template #body>
        <UForm id="create-team-form" :schema="teamSchema" :state="createForm" class="space-y-4" @submit="handleCreate">
          <UFormField name="name" label="Team Name" required>
            <UInput v-model="createForm.name" placeholder="e.g., Platform Team" />
          </UFormField>

          <UFormField name="email" label="Email">
            <UInput v-model="createForm.email" type="email" placeholder="team@example.com" />
          </UFormField>

          <UFormField name="responsibilityArea" label="Responsibility Area">
            <UInput v-model="createForm.responsibilityArea" placeholder="e.g., Infrastructure, Frontend, Data" />
          </UFormField>

          <UAlert
            v-if="createError"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-circle"
            :description="createError"
          />
        </UForm>
      </template>
      <template #footer="{ close }">
        <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
        <UButton
          type="submit"
          form="create-team-form"
          :loading="isCreating"
          :label="isCreating ? 'Creating...' : 'Create'"
        />
      </template>
    </UModal>

    <!-- Edit Team Modal -->
    <UModal v-model:open="showEditModal" title="Edit Team" :ui="{ footer: 'justify-end' }">
      <template #body>
        <UForm id="edit-team-form" :schema="teamSchema" :state="editForm" class="space-y-4" @submit="handleUpdate">
          <UFormField name="name" label="Team Name" required>
            <UInput v-model="editForm.name" placeholder="Team name" />
          </UFormField>

          <UFormField name="email" label="Email">
            <UInput v-model="editForm.email" type="email" placeholder="team@example.com" />
          </UFormField>

          <UFormField name="responsibilityArea" label="Responsibility Area">
            <UInput v-model="editForm.responsibilityArea" placeholder="e.g., Infrastructure, Frontend, Data" />
          </UFormField>

          <UAlert
            v-if="editError"
            color="error"
            variant="subtle"
            icon="i-lucide-alert-circle"
            :description="editError"
          />
        </UForm>
      </template>
      <template #footer="{ close }">
        <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
        <UButton
          type="submit"
          form="edit-team-form"
          :loading="isUpdating"
          :label="isUpdating ? 'Saving...' : 'Save'"
        />
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal" title="Delete Team" :ui="{ footer: 'justify-end' }">
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
        </div>
      </template>
      <template #footer="{ close }">
        <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
        <UButton
          :loading="isDeleting"
          :label="isDeleting ? 'Deleting...' : 'Delete'"
          color="error"
          @click="handleDelete"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent, TableColumn } from '@nuxt/ui'
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
        team.description ? h('p', { class: 'text-sm text-muted' }, team.description) : null
      ].filter(Boolean))
    }
  },
  {
    accessorKey: 'responsibilityArea',
    header: ({ column }) => getSortableHeader(column, 'Responsibility Area'),
    cell: ({ row }) => {
      const area = row.getValue('responsibilityArea') as string | undefined
      if (!area) return h('span', { class: 'text-muted' }, '—')
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
        'aria-label': `Actions for ${team.name}`,
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

const { searchInput, debouncedSearch } = useTableSearch()

const { sorting, page, pageSize, offset, sortBy, sortOrder } = usePaginatedSorting({
  resetOn: [debouncedSearch]
})

// Pass individual refs/computeds as query values so each one is tracked
// as a reactive dependency — wrapping the query in computed() causes hydration issues
const { data, pending, error } = await useFetch<ApiResponse<Team>>('/api/teams', {
  query: {
    limit: pageSize,
    offset,
    sortBy,
    sortOrder,
    search: debouncedSearch
  }
})

const teams = useApiData(data)
const total = useApiCount(data)

const teamSchema = z.object({
  name: z.string().trim().min(1, 'Team name is required'),
  email: z.union([z.literal(''), z.email('Invalid email')]).optional(),
  responsibilityArea: z.string().optional()
})
type TeamSchema = z.output<typeof teamSchema>

// --- Create Team ---

const showCreateModal = ref(false)
const isCreating = ref(false)
const createError = ref('')

const createForm = reactive<Partial<TeamSchema>>({
  name: '',
  email: '',
  responsibilityArea: ''
})

function openCreateModal() {
  Object.assign(createForm, { name: '', email: '', responsibilityArea: '' })
  createError.value = ''
  showCreateModal.value = true
}

async function handleCreate(event: FormSubmitEvent<TeamSchema>) {
  isCreating.value = true
  createError.value = ''

  try {
    const body: Record<string, string> = { name: event.data.name }
    if (event.data.email) body.email = event.data.email
    if (event.data.responsibilityArea) body.responsibilityArea = event.data.responsibilityArea

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

const editForm = reactive<Partial<TeamSchema>>({
  name: '',
  email: '',
  responsibilityArea: ''
})

function openEditModal(team: Team) {
  editOriginalName.value = team.name
  Object.assign(editForm, {
    name: team.name,
    email: (team as Team & { email?: string }).email || '',
    responsibilityArea: team.responsibilityArea || ''
  })
  editError.value = ''
  showEditModal.value = true
}

async function handleUpdate(event: FormSubmitEvent<TeamSchema>) {
  isUpdating.value = true
  editError.value = ''

  try {
    const body: Record<string, string> = { name: event.data.name }
    if (event.data.email !== undefined) body.email = event.data.email
    if (event.data.responsibilityArea !== undefined) body.responsibilityArea = event.data.responsibilityArea

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
