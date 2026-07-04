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

    <AsyncEditTechnologyModal
      v-if="editModalOpen"
      v-model:open="editModalOpen"
      :tech="editTech"
      :team-options="teamOptions"
      @saved="refreshNuxtData()"
    />

    <AsyncCreateVersionConstraintModal
      v-if="vcModalOpen"
      v-model:open="vcModalOpen"
      :tech="vcTech"
      :team-options="teamOptions"
    />

    <AsyncDeleteTechnologyModal
      v-if="deleteModalOpen"
      v-model:open="deleteModalOpen"
      :tech-name="deleteTechName"
      @deleted="refreshNuxtData()"
    />

    <AsyncSetTimeModal
      v-if="timeModalOpen"
      v-model:open="timeModalOpen"
      :tech="timeTech"
      :team-options="teamOptions"
      @saved="refreshNuxtData()"
    />

    <AsyncLinkComponentModal
      v-if="linkModalOpen"
      v-model:open="linkModalOpen"
      :tech-name="linkTechName"
      @linked="refreshNuxtData()"
    />
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse, Technology } from '~~/types/api'
import type { RadarTechnology } from '~~/server/services/technology.service'

const { getSortableHeader } = useSortableTable()
const { data: session } = useAuth()
const { isSuperuser } = useEffectiveRole()

const AsyncTechnologyRadar = defineAsyncComponent(() => import('../../components/TechnologyRadar.vue'))
const AsyncEditTechnologyModal = defineAsyncComponent(() => import('../../components/EditTechnologyModal.vue'))
const AsyncCreateVersionConstraintModal = defineAsyncComponent(() => import('../../components/CreateVersionConstraintModal.vue'))
const AsyncDeleteTechnologyModal = defineAsyncComponent(() => import('../../components/DeleteTechnologyModal.vue'))
const AsyncSetTimeModal = defineAsyncComponent(() => import('../../components/SetTimeModal.vue'))
const AsyncLinkComponentModal = defineAsyncComponent(() => import('../../components/LinkComponentModal.vue'))

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

interface TeamsResponse { success: boolean; data: { name: string }[]; count: number }
const { data: teamsData } = useLazyFetch<TeamsResponse>('/api/teams', { key: 'tech-edit-teams' })
const teamOptions = computed(() =>
  (teamsData.value?.data || []).map(t => t.name).sort()
)

const canSetTime = computed(() => isSuperuser.value || userTeams.value.length > 0)

// Edit modal
const editModalOpen = ref(false)
const editTech = ref<Technology | null>(null)

function openEditModal(tech: Technology) {
  editTech.value = tech
  editModalOpen.value = true
}

// Create Version Constraint modal
const vcModalOpen = ref(false)
const vcTech = ref<Technology | null>(null)

function openCreateVCModal(tech: Technology) {
  vcTech.value = tech
  vcModalOpen.value = true
}

// Delete modal
const deleteModalOpen = ref(false)
const deleteTechName = ref('')

function openDeleteModal(name: string) {
  deleteTechName.value = name
  deleteModalOpen.value = true
}

// Set TIME modal
const timeModalOpen = ref(false)
const timeModalTech = ref<Technology | null>(null)

function openTimeModal(tech: Technology) {
  timeModalTech.value = tech
  timeModalOpen.value = true
}

// Link Component modal
const linkModalOpen = ref(false)
const linkTechName = ref('')

function openLinkComponentModal(tech: Technology) {
  linkTechName.value = tech.name
  linkModalOpen.value = true
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
