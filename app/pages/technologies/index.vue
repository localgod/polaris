<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <UPageHeader
        title="Technologies"
        description="Governed technology choices across the organization"
        :ui="{ root: 'py-2' }"
      />
      <div class="flex items-center gap-2">
        <!-- View mode toggle -->
        <div class="flex gap-1 bg-(--ui-bg-elevated) rounded-md p-1">
          <UButton
            icon="i-lucide-table"
            :color="viewMode === 'table' ? 'primary' : 'neutral'"
            :variant="viewMode === 'table' ? 'solid' : 'ghost'"
            size="sm"
            aria-label="Table view"
            @click="viewMode = 'table'"
          />
          <UButton
            icon="i-lucide-radar"
            :color="viewMode === 'radar' ? 'primary' : 'neutral'"
            :variant="viewMode === 'radar' ? 'solid' : 'ghost'"
            size="sm"
            aria-label="Radar view"
            @click="viewMode = 'radar'"
          />
        </div>
        <UButton
          v-if="isSuperuser"
          size="sm"
          label="+ Create Technology"
          icon="i-lucide-link"
          to="/admin/component-links"
        />
      </div>
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
      <!-- Table view -->
      <PaginatedTable
        v-if="viewMode === 'table'"
        v-model:sorting="sorting"
        v-model:page="page"
        :manual-sorting="true"
        :data="technologies"
        :columns="columns"
        :loading="pending"
        :total="total"
        :page-size="pageSize"
      >
        <template #header>
          <TableSearchHeader v-model="searchInput" />
        </template>
        <template #empty>
          <div class="text-center text-(--ui-text-muted) py-12">
            No technologies found.
          </div>
        </template>
      </PaginatedTable>

      <!-- Radar view -->
      <template v-if="viewMode === 'radar'">
        <div class="flex items-center gap-3 mb-4">
          <label class="text-sm font-medium text-(--ui-text)">Team</label>
          <USelect
            v-model="radarTeam"
            :items="radarTeamItems"
            class="w-56"
          />
          <UBadge v-if="radarPending" color="neutral" variant="subtle">Loading…</UBadge>
        </div>
        <UCard>
          <AsyncTechnologyRadar :data="radarData" />
        </UCard>
      </template>
    </template>

    <!-- Edit Technology Modal -->
    <UModal v-model:open="editModalOpen" :ui="{ footer: 'justify-end' }">
      <template #header>
        <h3 class="text-lg font-semibold">Edit Technology: {{ editTechName }}</h3>
      </template>
      <template #body>
        <UForm id="edit-tech-form" :schema="editSchema" :state="editState" class="space-y-4" @submit="onEdit">
          <UFormField name="type" label="Type" required>
            <USelect v-model="editState.type" :items="typeOptions" />
          </UFormField>
          <UFormField name="domain" label="Domain">
            <USelect v-model="editState.domain" :items="domainOptions" placeholder="No domain" />
          </UFormField>
          <UFormField name="vendor" label="Vendor">
            <UInput v-model="editState.vendor" placeholder="e.g. Google, Microsoft" />
          </UFormField>
          <UFormField name="ownerTeam" label="Owner Team">
            <USelect v-model="editState.ownerTeam" :items="teamOptions" placeholder="No owner team" />
          </UFormField>
          <UFormField name="lastReviewed" label="Last Reviewed">
            <UInput v-model="editState.lastReviewed" type="date" />
          </UFormField>
          <UAlert v-if="editError" color="error" variant="subtle" icon="i-lucide-alert-circle" :description="editError" />
        </UForm>
      </template>
      <template #footer="{ close }">
        <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
        <UButton type="submit" form="edit-tech-form" :loading="editLoading" label="Save" />
      </template>
    </UModal>

    <!-- Create Version Constraint Modal -->
    <UModal v-model:open="vcModalOpen" :ui="{ footer: 'justify-end' }">
      <template #header>
        <h3 class="text-lg font-semibold">Create Version Constraint for {{ vcTechName }}</h3>
      </template>
      <template #body>
        <UForm id="vc-form" :schema="vcSchema" :state="vcState" class="space-y-4" @submit="onCreateVC">
          <UFormField name="name" label="Name" required>
            <UInput v-model="vcState.name" />
          </UFormField>
          <UFormField name="description" label="Description">
            <UInput v-model="vcState.description" placeholder="What does this constraint enforce?" />
          </UFormField>
          <UFormField name="severity" label="Severity" required>
            <USelect v-model="vcState.severity" :items="vcSeverityOptions" />
          </UFormField>
          <UFormField name="versionRange" label="Version Range" required>
            <UInput v-model="vcState.versionRange" placeholder="e.g. >=18.0.0 <20.0.0" />
          </UFormField>
          <div class="grid grid-cols-2 gap-4">
            <UFormField name="scope" label="Scope" required>
              <USelect v-model="vcState.scope" :items="isSuperuser ? ['organization', 'team'] : ['team']" />
            </UFormField>
            <UFormField v-if="vcState.scope === 'team'" name="subjectTeam" label="Team" required>
              <USelect v-model="vcState.subjectTeam" :items="isSuperuser ? teamOptions : userTeams" placeholder="Select team" />
            </UFormField>
          </div>
          <UAlert v-if="vcError" color="error" variant="subtle" icon="i-lucide-alert-circle" :description="vcError" />
        </UForm>
      </template>
      <template #footer="{ close }">
        <UButton label="Cancel" color="neutral" variant="outline" @click="close" />
        <UButton type="submit" form="vc-form" :loading="vcLoading" label="Create" />
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
    <UModal v-model:open="timeModalOpen" :ui="{ footer: 'justify-end' }">
      <template #header>
        <h3 class="text-lg font-semibold">Set TIME: {{ timeModalTech?.name }}</h3>
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
            No components found.
          </div>
          <div v-if="linkSearchResults.length > 0" class="max-h-60 overflow-y-auto border border-(--ui-border) rounded-md divide-y divide-(--ui-border)">
            <UButton
              v-for="comp in linkSearchResults"
              :key="`${comp.name}@${comp.version}`"
              variant="ghost"
              color="neutral"
              class="w-full justify-start px-3 py-2"
              :class="{ 'bg-(--ui-bg-elevated)': linkSelected?.name === comp.name && linkSelected?.version === comp.version }"
              @click="linkSelected = { name: comp.name, version: comp.version }"
            >
              <span class="font-medium">{{ comp.name }}</span>
              <code class="ml-2 text-sm">{{ comp.version }}</code>
            </UButton>
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
import { defineAsyncComponent, h } from 'vue'
import * as z from 'zod'
import type { TableColumn, FormSubmitEvent } from '@nuxt/ui'
import type { ApiResponse, Technology } from '~~/types/api'
import type { RadarTechnology } from '~~/server/services/technology.service'

const { getSortableHeader } = useSortableTable()
const { data: session } = useAuth()
const { isSuperuser } = useEffectiveRole()

const AsyncTechnologyRadar = defineAsyncComponent(() => import('../../components/TechnologyRadar.vue'))

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
    header: ({ column }) => getSortableHeader(column, 'Constraints'),
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
const editSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  domain: z.string().optional(),
  vendor: z.string().optional(),
  ownerTeam: z.string().optional(),
  lastReviewed: z.string().optional()
})
type EditSchema = z.infer<typeof editSchema>

const editModalOpen = ref(false)
const editLoading = ref(false)
const editError = ref('')
const editTechName = ref('')
const editState = reactive<Partial<EditSchema>>({
  type: '',
  domain: undefined,
  vendor: '',
  ownerTeam: undefined,
  lastReviewed: ''
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
const { data: teamsData } = useLazyFetch<TeamsResponse>('/api/teams', { key: 'tech-edit-teams' })
const teamOptions = computed(() =>
  (teamsData.value?.data || []).map(t => t.name).sort()
)

function openEditModal(tech: Technology) {
  editTechName.value = tech.name
  Object.assign(editState, {
    type: tech.type || '',
    domain: tech.domain || undefined,
    vendor: tech.vendor || '',
    ownerTeam: tech.ownerTeamName || undefined,
    lastReviewed: tech.lastReviewed || ''
  })
  editError.value = ''
  editModalOpen.value = true
}

async function onEdit(event: FormSubmitEvent<EditSchema>) {
  editLoading.value = true
  editError.value = ''

  try {
    await $fetch(`/api/technologies/${encodeURIComponent(editTechName.value)}`, {
      method: 'PUT',
      body: {
        type: event.data.type,
        domain: event.data.domain || null,
        vendor: event.data.vendor || null,
        ownerTeam: event.data.ownerTeam || null,
        lastReviewed: event.data.lastReviewed || null
      }
    })
    editModalOpen.value = false
    await refreshNuxtData()
  }
  catch (err: unknown) {
    const error = err as { data?: { message?: string }; message?: string }
    editError.value = error.data?.message || error.message || 'Failed to update technology'
  }
  finally {
    editLoading.value = false
  }
}

// Create Version Constraint modal state
const vcSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  severity: z.string().min(1, 'Severity is required'),
  scope: z.string().min(1, 'Scope is required'),
  subjectTeam: z.string().optional(),
  versionRange: z.string().min(1, 'Version range is required')
}).refine(data => data.scope !== 'team' || !!data.subjectTeam, {
  message: 'Team is required when scope is team',
  path: ['subjectTeam']
})
type VcSchema = z.infer<typeof vcSchema>

const vcModalOpen = ref(false)
const vcLoading = ref(false)
const vcError = ref('')
const vcTechName = ref('')
const vcState = reactive<Partial<VcSchema>>({
  name: '',
  description: '',
  severity: 'error',
  scope: 'team',
  subjectTeam: undefined,
  versionRange: ''
})
const vcSeverityOptions = ['critical', 'error', 'warning', 'info']

function openCreateVCModal(tech: Technology) {
  const defaultName = `${tech.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-version-constraint`
  vcTechName.value = tech.name
  Object.assign(vcState, {
    name: defaultName,
    description: '',
    severity: 'error',
    scope: isSuperuser.value ? 'organization' : 'team',
    subjectTeam: isSuperuser.value ? undefined : (userTeams.value[0] || undefined),
    versionRange: ''
  })
  vcError.value = ''
  vcModalOpen.value = true
}

async function onCreateVC(event: FormSubmitEvent<VcSchema>) {
  vcLoading.value = true
  vcError.value = ''

  try {
    await $fetch('/api/version-constraints', {
      method: 'POST',
      body: {
        name: event.data.name,
        description: event.data.description || undefined,
        severity: event.data.severity,
        scope: event.data.scope,
        subjectTeam: event.data.scope === 'team' ? event.data.subjectTeam : undefined,
        versionRange: event.data.versionRange,
        governsTechnology: vcTechName.value
      }
    })
    vcModalOpen.value = false
  }
  catch (err: unknown) {
    const error = err as { data?: { message?: string }; message?: string }
    vcError.value = error.data?.message || error.message || 'Failed to create version constraint'
  }
  finally {
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
const timeSchema = z.object({
  teamName: z.string().min(1, 'Team is required'),
  time: z.string().min(1, 'TIME value is required'),
  notes: z.string().optional()
})
type TimeSchema = z.infer<typeof timeSchema>

const timeModalOpen = ref(false)
const timeLoading = ref(false)
const timeError = ref('')
const timeModalTech = ref<Technology | null>(null)
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

function openTimeModal(tech: Technology) {
  timeModalTech.value = tech
  const defaultTeam = isSuperuser.value
    ? undefined
    : (userTeams.value.length === 1 ? userTeams.value[0] : undefined)

  const existingApproval = defaultTeam
    ? tech.approvals?.find(a => a.team === defaultTeam)
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
  if (!newTeam || !timeModalTech.value) return
  const existing = timeModalTech.value.approvals?.find(a => a.team === newTeam)
  timeState.time = existing?.time || undefined
  timeState.notes = existing?.notes || ''
})

async function onSetTime(event: FormSubmitEvent<TimeSchema>) {
  if (!timeModalTech.value) return
  timeLoading.value = true
  timeError.value = ''

  try {
    await $fetch(`/api/technologies/${encodeURIComponent(timeModalTech.value.name)}/approvals`, {
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

const { searchInput, debouncedSearch } = useTableSearch()

const { sorting, page, pageSize, offset, sortBy, sortOrder } = usePaginatedSorting({
  resetOn: [debouncedSearch]
})

// Pass individual refs/computeds as query values so each one is tracked
// as a reactive dependency — wrapping the query in computed() causes hydration issues
const { data, pending, error } = await useFetch<ApiResponse<Technology>>('/api/technologies', {
  query: {
    limit: pageSize,
    offset,
    sortBy,
    sortOrder,
    search: debouncedSearch
  }
})

const technologies = useApiData(data)
const total = useApiCount(data)

// ── View mode (declared after await so it's bound to the correct component instance) ──
const LS_KEY = 'polaris:technologies:viewMode'
const viewMode = ref<'table' | 'radar'>('table')

onMounted(() => {
  const stored = localStorage.getItem(LS_KEY)
  if (stored === 'radar' || stored === 'table') viewMode.value = stored
  watch(viewMode, v => localStorage.setItem(LS_KEY, v))
})

// ── Radar data ────────────────────────────────────────────────────────────────
const ALL_TEAMS_VALUE = '__all__'
const radarTeam = ref<string>(ALL_TEAMS_VALUE)

const radarTeamItems = computed(() => [
  { label: 'All teams', value: ALL_TEAMS_VALUE },
  ...(teamsData.value?.data || []).map(t => ({ label: t.name, value: t.name })).sort((a, b) => a.label.localeCompare(b.label))
])

const radarQuery = computed(() => radarTeam.value !== ALL_TEAMS_VALUE ? { team: radarTeam.value } : {})

const { data: radarResponse, pending: radarPending } = useLazyFetch<ApiResponse<RadarTechnology>>(
  '/api/technologies/radar',
  {
    query: radarQuery,
    watch: [radarQuery],
  }
)

const radarData = computed(() => radarResponse.value?.data || [])

useHead({ title: 'Technologies - Polaris' })
</script>
