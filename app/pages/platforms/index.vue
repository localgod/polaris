<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <UPageHeader
        title="Platforms"
        description="Manually-declared infrastructure and services — not observable via SBOM scanning"
        :ui="{ root: 'py-2' }"
      />
      <UButton
        v-if="isSuperuser"
        size="sm"
        label="+ Create Platform"
        to="/platforms/new"
      />
    </div>

    <UAlert
      color="info"
      variant="subtle"
      icon="i-lucide-info"
      title="How Platforms differ from Technologies"
      description="A Technology must be linked to at least one Component discovered by an SBOM scan. A Platform never has that evidence — it's a deliberate, superuser-declared exception for things like databases, cloud services, and container runtimes that a source-manifest scan can't see."
    />

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Error"
      :description="error.message"
    />

    <UCard v-else>
      <UTable
        v-model:sorting="sorting"
        :manual-sorting="true"
        :data="platforms"
        :columns="columns"
        :loading="pending"
        class="flex-1"
      >
        <template #empty>
          <div class="text-center text-(--ui-text-muted) py-12">
            No platforms found.
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

    <!-- Edit Platform Modal -->
    <UModal v-model:open="editModalOpen" :ui="{ footer: 'justify-end' }">
      <template #header>
        <h3 class="text-lg font-semibold">Edit Platform: {{ editPlatformName }}</h3>
      </template>
      <template #body>
        <UForm id="edit-platform-form" :schema="editSchema" :state="editState" class="space-y-4" @submit="onEdit">
          <UFormField name="type" label="Type" required>
            <USelect v-model="editState.type" :items="typeOptions" />
          </UFormField>
          <UFormField name="domain" label="Domain">
            <USelect v-model="editState.domain" :items="domainOptions" placeholder="No domain" />
          </UFormField>
          <UFormField name="vendor" label="Vendor">
            <UInput v-model="editState.vendor" placeholder="e.g. AWS, MongoDB Inc." />
          </UFormField>
          <UFormField name="stewardTeam" label="Steward Team">
            <USelect v-model="editState.stewardTeam" :items="teamOptions" placeholder="No steward team" />
          </UFormField>
          <UAlert v-if="editError" color="error" variant="subtle" icon="i-lucide-alert-circle" :description="editError" />
        </UForm>
      </template>
      <template #footer="{ close }">
        <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
        <UButton type="submit" form="edit-platform-form" :loading="editLoading" label="Save" />
      </template>
    </UModal>

    <!-- Delete Platform Modal -->
    <UModal v-model:open="deleteModalOpen">
      <template #header>
        <h3 class="text-lg font-semibold">Delete Platform</h3>
      </template>
      <template #body>
        <p>
          Are you sure you want to delete <strong>{{ deleteTarget }}</strong>?
          This will remove the platform and all its relationships.
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
    <UModal v-model:open="timeModalOpen" :ui="{ footer: 'justify-end' }">
      <template #header>
        <h3 class="text-lg font-semibold">Set TIME: {{ timeModalPlatform?.name }}</h3>
      </template>
      <template #body>
        <UForm id="time-form" :schema="timeSchema" :state="timeState" class="space-y-4" @submit="onSetTime">
          <UFormField name="teamName" label="Team" required>
            <UInput v-if="timeTeamReadonly" :model-value="timeState.teamName" disabled />
            <USelect v-else v-model="timeState.teamName" :items="timeTeamOptions" placeholder="Select team" />
          </UFormField>
          <UFormField name="time" label="TIME Value" required>
            <USelect v-model="timeState.time" :items="timeOptions" placeholder="Select TIME value" />
          </UFormField>
          <UFormField name="notes" label="Notes">
            <UTextarea v-model="timeState.notes" placeholder="Optional notes" />
          </UFormField>
          <UAlert v-if="timeError" color="error" variant="subtle" icon="i-lucide-alert-circle" :description="timeError" />
        </UForm>
      </template>
      <template #footer="{ close }">
        <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
        <UButton type="submit" form="time-form" :loading="timeLoading" label="Save" />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import * as z from 'zod'
import type { TableColumn, FormSubmitEvent } from '@nuxt/ui'
import type { ApiResponse, Platform } from '~~/types/api'

const { getSortableHeader } = useSortableTable()
const { data: session } = useAuth()
const { isSuperuser } = useEffectiveRole()

const userTeams = computed(() =>
  (session.value?.user?.teams as { name: string }[] | undefined)?.map(t => t.name) || []
)

function canManagePlatform(platform: Platform): boolean {
  if (isSuperuser.value) return true
  if (!platform.stewardTeamName) return false
  return userTeams.value.includes(platform.stewardTeamName)
}

const columns: TableColumn<Platform>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => getSortableHeader(column, 'Name'),
    cell: ({ row }) => {
      return h(resolveComponent('NuxtLink'), {
        to: `/platforms/${encodeURIComponent(row.original.name)}`,
        class: 'font-medium hover:underline'
      }, () => row.original.name)
    }
  },
  {
    accessorKey: 'type',
    header: ({ column }) => getSortableHeader(column, 'Type'),
    cell: ({ row }) => {
      const type = row.getValue('type') as string | undefined
      if (!type) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(resolveComponent('UBadge'), { color: 'neutral', variant: 'subtle' }, () => type)
    }
  },
  {
    accessorKey: 'domain',
    header: ({ column }) => getSortableHeader(column, 'Domain'),
    cell: ({ row }) => {
      const domain = row.getValue('domain') as string | undefined
      if (!domain) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(resolveComponent('UBadge'), { color: 'info', variant: 'subtle' }, () => domain)
    }
  },
  {
    accessorKey: 'stewardTeamName',
    header: ({ column }) => getSortableHeader(column, 'Steward Team'),
    cell: ({ row }) => (row.getValue('stewardTeamName') as string | undefined) || h('span', { class: 'text-(--ui-text-muted)' }, '—')
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    meta: { class: { th: 'w-10', td: 'text-right' } },
    cell: ({ row }) => {
      const platform = row.original
      const viewGroup = [
        { label: 'View Details', icon: 'i-lucide-eye', onSelect: () => navigateTo(`/platforms/${encodeURIComponent(platform.name)}`) }
      ]
      const items: { label: string; icon: string; onSelect: () => void }[][] = [viewGroup]

      if (canSetTime.value) {
        items.push([
          { label: 'Set TIME', icon: 'i-lucide-clock', onSelect: () => openTimeModal(platform) }
        ])
      }

      if (canManagePlatform(platform)) {
        items.push([
          { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => openEditModal(platform) }
        ])
        items.push([
          { label: 'Delete', icon: 'i-lucide-trash-2', onSelect: () => openDeleteModal(platform.name) }
        ])
      }

      return h(resolveComponent('UDropdownMenu'), { items, content: { align: 'end' } }, {
        default: () => h(resolveComponent('UButton'), { icon: 'i-lucide-ellipsis-vertical', color: 'neutral', variant: 'ghost', size: 'sm' })
      })
    }
  }
]

// Edit modal state
const editSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  domain: z.string().optional(),
  vendor: z.string().optional(),
  stewardTeam: z.string().optional()
})
type EditSchema = z.infer<typeof editSchema>

const editModalOpen = ref(false)
const editLoading = ref(false)
const editError = ref('')
const editPlatformName = ref('')
const editState = reactive<Partial<EditSchema>>({
  type: '',
  domain: undefined,
  vendor: '',
  stewardTeam: undefined
})

const typeOptions = [
  'application', 'framework', 'library', 'container', 'platform',
  'operating-system', 'device', 'device-driver', 'firmware',
  'file', 'machine-learning-model', 'data'
]

const domainOptions = [
  'foundational-runtime', 'framework', 'data-platform',
  'integration-platform', 'security-identity', 'infrastructure',
  'observability', 'developer-tooling', 'other'
]

interface TeamsResponse { success: boolean; data: { name: string }[]; count: number }
const { data: teamsData } = useLazyFetch<TeamsResponse>('/api/teams', { key: 'platform-edit-teams' })
const teamOptions = computed(() =>
  (teamsData.value?.data || []).map(t => t.name).sort()
)

function openEditModal(platform: Platform) {
  editPlatformName.value = platform.name
  Object.assign(editState, {
    type: platform.type || '',
    domain: platform.domain || undefined,
    vendor: platform.vendor || '',
    stewardTeam: platform.stewardTeamName || undefined
  })
  editError.value = ''
  editModalOpen.value = true
}

async function onEdit(event: FormSubmitEvent<EditSchema>) {
  editLoading.value = true
  editError.value = ''

  try {
    await $fetch(`/api/platforms/${encodeURIComponent(editPlatformName.value)}`, {
      method: 'PUT',
      body: {
        type: event.data.type,
        domain: event.data.domain || null,
        vendor: event.data.vendor || null,
        stewardTeam: event.data.stewardTeam || null
      }
    })
    editModalOpen.value = false
    await refreshNuxtData()
  }
  catch (err: unknown) {
    const error = err as { data?: { message?: string }; message?: string }
    editError.value = error.data?.message || error.message || 'Failed to update platform'
  }
  finally {
    editLoading.value = false
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
    await $fetch(`/api/platforms/${encodeURIComponent(deleteTarget.value)}`, {
      method: 'DELETE'
    })
    deleteModalOpen.value = false
    await refreshNuxtData()
  } catch (err: unknown) {
    const error = err as { data?: { message?: string }; message?: string }
    deleteError.value = error.data?.message || error.message || 'Failed to delete platform'
  } finally {
    deleteLoading.value = false
  }
}

// Set TIME modal state
const timeSchema = z.object({
  teamName: z.string().min(1, 'Team is required'),
  time: z.string().min(1, 'TIME value is required'),
  notes: z.string().optional()
})
type TimeSchema = z.infer<typeof timeSchema>

const timeModalOpen = ref(false)
const timeLoading = ref(false)
const timeError = ref('')
const timeModalPlatform = ref<Platform | null>(null)
const timeState = reactive<Partial<TimeSchema>>({
  teamName: undefined,
  time: undefined,
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

function openTimeModal(platform: Platform) {
  timeModalPlatform.value = platform
  const defaultTeam = isSuperuser.value
    ? undefined
    : (userTeams.value.length === 1 ? userTeams.value[0] : undefined)

  const existingApproval = defaultTeam
    ? platform.approvals?.find(a => a.team === defaultTeam)
    : undefined

  Object.assign(timeState, {
    teamName: defaultTeam,
    time: existingApproval?.time || undefined,
    notes: existingApproval?.notes || ''
  })
  timeError.value = ''
  timeModalOpen.value = true
}

watch(() => timeState.teamName, (newTeam) => {
  if (!newTeam || !timeModalPlatform.value) return
  const existing = timeModalPlatform.value.approvals?.find(a => a.team === newTeam)
  timeState.time = existing?.time || undefined
  timeState.notes = existing?.notes || ''
})

async function onSetTime(event: FormSubmitEvent<TimeSchema>) {
  if (!timeModalPlatform.value) return
  timeLoading.value = true
  timeError.value = ''

  try {
    await $fetch(`/api/platforms/${encodeURIComponent(timeModalPlatform.value.name)}/approvals`, {
      method: 'POST',
      body: {
        teamName: event.data.teamName,
        time: event.data.time,
        notes: event.data.notes || undefined
      }
    })
    timeModalOpen.value = false
    await refreshNuxtData()
  }
  catch (err: unknown) {
    const error = err as { data?: { message?: string }; message?: string }
    timeError.value = error.data?.message || error.message || 'Failed to set TIME value'
  }
  finally {
    timeLoading.value = false
  }
}

const sorting = ref([])
const page = ref(1)
const pageSize = 20

watch(sorting, () => { page.value = 1 })

const sortBy = computed(() => sorting.value.length ? sorting.value[0].id : undefined)
const sortOrder = computed(() => sorting.value.length ? (sorting.value[0].desc ? 'desc' : 'asc') : undefined)
const offset = computed(() => (page.value - 1) * pageSize)

const { data, pending, error } = await useFetch<ApiResponse<Platform>>('/api/platforms', {
  query: { limit: pageSize, offset, sortBy, sortOrder }
})

const platforms = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

useHead({ title: 'Platforms - Polaris' })
</script>
