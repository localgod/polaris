<template>
  <div class="space-y-6">
    <USkeleton v-if="pending" class="h-96 w-full" />

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Error Loading Technology"
      :description="error.message"
    >
      <template #actions>
        <UButton label="Back to Technologies" to="/technologies" variant="outline" />
      </template>
    </UAlert>

    <template v-else-if="tech">
      <div class="flex justify-between items-center">
        <UPageHeader
          :title="tech.name"
          :links="[
            { label: 'Back to Technologies', to: '/technologies', icon: 'i-lucide-arrow-left', variant: 'outline' as const },
            { label: 'View Impact Graph', to: `/technologies/${encodeURIComponent(tech.name)}/impact`, icon: 'i-lucide-share-2', variant: 'outline' as const },
          ]"
        />
        <div class="flex gap-2">
          <UBadge v-if="tech.type" color="neutral" variant="subtle">
            {{ tech.type }}
          </UBadge>
          <UBadge v-if="tech.domain" color="info" variant="subtle">
            {{ tech.domain }}
          </UBadge>
          <UBadge v-if="timeCategory" :color="getTimeCategoryColor(timeCategory)" variant="subtle">
            {{ timeCategory }}
          </UBadge>
          <UBadge :color="getEolColor(tech.lifecycleSummary?.status)" variant="subtle">
            {{ getEolLabel(tech.lifecycleSummary?.status) }}
          </UBadge>
        </div>
      </div>

      <EntityStatStrip :items="statItems" />

      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Basic Information</h2>
        </template>
        <EntityDescriptionList :items="basicInfoItems" />
      </UCard>

      <!-- Technology Approvals -->
      <PaginatedTable
        v-model:sorting="approvalSorting"
        :data="tech.technologyApprovals ?? []"
        :columns="approvalColumns"
      >
        <template #header>
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-semibold">Approvals ({{ tech.technologyApprovals?.length || 0 }})</h2>
            <UButton
              v-if="userTeams.length > 0"
              label="Set TIME Category"
              icon="i-lucide-clock"
              size="sm"
              variant="outline"
              @click="openApprovalModal()"
            />
          </div>
        </template>
        <template #empty>
          <div class="text-center text-(--ui-text-muted) py-8">
            No approvals yet.
          </div>
        </template>
      </PaginatedTable>

      <!-- Set TIME Category Modal -->
      <UModal v-model:open="approvalModalOpen">
        <template #header>
          <h3 class="text-lg font-semibold">Set TIME Category</h3>
        </template>
        <template #body>
          <form class="space-y-4" @submit.prevent="submitApproval">
            <UFormField label="Team" required>
              <USelect
                v-model="approvalForm.teamName"
                :items="teamSelectItems"
                placeholder="Select your team"
                @update:model-value="onTeamChange"
              />
            </UFormField>

            <UFormField label="TIME Category" required>
              <USelect
                v-model="approvalForm.time"
                :items="timeItems"
                placeholder="Select TIME category"
              />
            </UFormField>

            <UFormField label="Environment" hint="Leave blank to apply to all environments">
              <USelect
                v-model="approvalForm.environment"
                :items="environmentItems"
                placeholder="All environments"
                @update:model-value="onTeamChange"
              />
            </UFormField>

            <UFormField label="Notes">
              <UTextarea
                v-model="approvalForm.notes"
                placeholder="Reason for this categorization..."
                :rows="3"
              />
            </UFormField>

            <UAlert
              v-if="existingApproval"
              color="info"
              variant="subtle"
              icon="i-lucide-info"
              :description="`This will update the existing '${existingApproval.time}' approval from ${existingApproval.team}.`"
            />

            <UAlert
              v-if="approvalError"
              color="error"
              variant="subtle"
              icon="i-lucide-alert-circle"
              :description="approvalError"
            />
          </form>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" variant="outline" @click="approvalModalOpen = false" />
            <UButton
              label="Save"
              color="primary"
              :loading="approvalSubmitting"
              :disabled="!approvalForm.teamName || !approvalForm.time"
              @click="submitApproval"
            />
          </div>
        </template>
      </UModal>

      <!-- Version Risk, Versions, Components, Version Constraints — kept in one card:
           version rows carry live violation warnings cross-referenced against
           Components and Version Constraints (see getVersionViolation), so these
           stay visible together rather than split behind tabs. -->
      <UCard>
        <div class="divide-y divide-(--ui-border)">
          <div class="first:pt-0 last:pb-0 py-6">
            <h3 class="text-base font-semibold mb-3">Version Risk</h3>
            <UTable
              v-if="versionRiskData && versionRiskData.length > 0"
              v-model:sorting="versionRiskSorting"
              :data="versionRiskData"
              :columns="versionRiskColumns"
              class="flex-1"
            />
            <div v-else class="text-center text-(--ui-text-muted) py-8">
              No versions found.
            </div>
          </div>

          <div v-if="tech.versions && tech.versions.length > 0" class="first:pt-0 last:pb-0 py-6">
            <h3 class="text-base font-semibold mb-3">Versions ({{ tech.versions.length }})</h3>
            <UTable v-model:sorting="versionSorting" :data="versionRows" :columns="versionColumns" class="flex-1" />
          </div>

          <div v-if="tech.components && tech.components.length > 0" class="first:pt-0 last:pb-0 py-6">
            <h3 class="text-base font-semibold mb-3">Components ({{ tech.components.length }})</h3>
            <UTable v-model:sorting="componentSorting" :data="tech.components" :columns="componentColumns" class="flex-1" />
          </div>

          <div v-if="tech.constraints && tech.constraints.length > 0" class="first:pt-0 last:pb-0 py-6">
            <h3 class="text-base font-semibold mb-3">Version Constraints ({{ tech.constraints.length }})</h3>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="vc in tech.constraints"
                :key="vc.name"
                :label="vc.name"
                :to="`/version-constraints/${encodeURIComponent(vc.name)}`"
                variant="subtle"
                color="neutral"
                size="sm"
              >
                <template #trailing>
                  <UBadge :color="getSeverityColor(vc.severity)" variant="subtle" size="xs">
                    {{ vc.severity }}
                  </UBadge>
                </template>
              </UButton>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Systems -->
      <div v-if="tech.systems && tech.systems.length > 0">
        <h2 class="text-lg font-semibold mb-3">Systems ({{ tech.systems.length }})</h2>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="system in tech.systems"
            :key="system"
            :label="system"
            :to="`/systems/${encodeURIComponent(system)}`"
            variant="subtle"
            color="neutral"
            size="sm"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { EOLStatus, EOLStatusValue, TechnologyApproval, TechnologyLifecycleSummary, TechnologyVersionLifecycle } from '~~/types/api'
import semver from 'semver'

const PM_COLORS: Record<string, string> = {
  npm: '#cb3837', yarn: '#2c8ebb', maven: '#c71a36', gradle: '#02303a',
  pypi: '#3572a5', cargo: '#dea584', nuget: '#004880', gem: '#cc342d',
  go: '#00add8', composer: '#885630', unknown: '#6b7280',
}

const PM_ICONS: Record<string, string> = {
  npm:      'i-simple-icons-npm',
  yarn:     'i-simple-icons-yarn',
  maven:    'i-simple-icons-apachemaven',
  gradle:   'i-simple-icons-gradle',
  pypi:     'i-simple-icons-pypi',
  cargo:    'i-simple-icons-rust',
  nuget:    'i-simple-icons-nuget',
  gem:      'i-simple-icons-rubygems',
  go:       'i-simple-icons-go',
  composer: 'i-simple-icons-composer',
}

function pmIcon(pm: string | null | undefined): string {
  return PM_ICONS[(pm ?? 'unknown').toLowerCase()] ?? 'i-lucide-package'
}

function pmColor(pm: string | null | undefined): string {
  return PM_COLORS[(pm ?? 'unknown').toLowerCase()] ?? PM_COLORS.unknown
}

const { getSortableHeader } = useSortableTable()
const approvalSorting = ref([])
const versionSorting = ref([])
const versionRiskSorting = ref([])
const componentSorting = ref([])

const route = useRoute()
const { data: session } = useAuth()

const userTeams = computed(() =>
  (session.value?.user?.teams as { name: string }[] | undefined)?.map(t => t.name) || []
)

interface VersionDetail {
  version: string
  releaseDate: string | null
  eolDate: string | null
  lifecycle: EOLStatus | null
  approved: boolean
  notes: string | null
}

interface ComponentRef {
  name: string
  version: string
  packageManager: string | null
}

interface ConstraintRef {
  name: string
  severity: string
  versionRange: string | null
  status: string | null
}

interface TechnologyDetailData {
  name: string
  type: string
  domain: string | null
  vendor: string | null
  lastReviewed: string | null
  ownerTeamName: string | null
  ownerTeamEmail: string | null
  versions: VersionDetail[]
  components: ComponentRef[]
  systems: string[]
  constraints: ConstraintRef[]
  technologyApprovals: TechnologyApproval[]
  versionApprovals: TechnologyApproval[]
  lifecycleSummary: TechnologyLifecycleSummary
  versionLifecycles: TechnologyVersionLifecycle[]
}

interface TechnologyResponse {
  success: boolean
  data: TechnologyDetailData
}

function getEolColor(status?: EOLStatusValue): 'success' | 'warning' | 'error' | 'neutral' {
  const colors: Record<EOLStatusValue, 'success' | 'warning' | 'error' | 'neutral'> = {
    active: 'success',
    approaching_eol: 'warning',
    unsupported: 'error',
    unknown: 'neutral'
  }
  return colors[status || 'unknown']
}

function getEolLabel(status?: EOLStatusValue): string {
  const labels: Record<EOLStatusValue, string> = {
    active: 'Active',
    approaching_eol: 'Approaching EOL',
    unsupported: 'Unsupported',
    unknown: 'Unknown'
  }
  return labels[status || 'unknown']
}

function formatDate(dateString: string): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString()
}

const versionColumns: TableColumn<VersionDetail>[] = [
  {
    accessorKey: 'version',
    header: ({ column }) => getSortableHeader(column, 'Version'),
    cell: ({ row }) => h('code', {}, row.getValue('version') as string)
  },
  {
    accessorKey: 'approved',
    header: ({ column }) => getSortableHeader(column, 'Status'),
    cell: ({ row }) => {
      const approved = row.getValue('approved') as boolean
      const color = approved ? 'success' : 'warning'
      const label = approved ? 'approved' : 'pending'
      return h(resolveComponent('UBadge'), { color, variant: 'subtle' }, () => label)
    }
  },
  {
    accessorKey: 'releaseDate',
    header: ({ column }) => getSortableHeader(column, 'Released'),
    cell: ({ row }) => {
      const date = row.getValue('releaseDate') as string | null
      return date ? formatDate(date) : '—'
    }
  },
  {
    accessorKey: 'eolDate',
    header: ({ column }) => getSortableHeader(column, 'Governance EOL'),
    cell: ({ row }) => {
      const date = row.getValue('eolDate') as string | null
      return date ? formatDate(date) : '—'
    }
  },
  {
    id: 'lifecycle',
    header: 'Lifecycle',
    cell: ({ row }) => {
      const status = row.original.lifecycle?.status
      return h(resolveComponent('UBadge'), { color: getEolColor(status), variant: 'subtle' }, () => getEolLabel(status))
    }
  },
  {
    id: 'sourceEol',
    header: 'Source EOL',
    cell: ({ row }) => {
      const lifecycle = row.original.lifecycle
      if (!lifecycle || lifecycle.status === 'unknown') return '—'
      const date = lifecycle.eolDate ? formatDate(lifecycle.eolDate) : '—'
      const suffix = lifecycle.daysUntilEOL !== null
        ? ` (${lifecycle.daysUntilEOL}d left)`
        : lifecycle.daysSinceEOL !== null
          ? ` (${lifecycle.daysSinceEOL}d past)`
          : ''
      return `${date}${suffix}`
    }
  },
  {
    accessorKey: 'notes',
    header: ({ column }) => getSortableHeader(column, 'Notes'),
    cell: ({ row }) => {
      const notes = row.getValue('notes') as string | null
      return notes || '—'
    }
  }
]

const approvalColumns: TableColumn<TechnologyApproval>[] = [
  {
    accessorKey: 'team',
    header: ({ column }) => getSortableHeader(column, 'Team'),
    cell: ({ row }) => {
      const team = row.getValue('team') as string
      return h(resolveComponent('NuxtLink'), {
        to: `/teams/${encodeURIComponent(team)}`,
        class: 'font-medium hover:underline'
      }, () => team)
    }
  },
  {
    accessorKey: 'time',
    header: ({ column }) => getSortableHeader(column, 'TIME'),
    cell: ({ row }) => {
      const time = row.getValue('time') as string | null
      if (!time) return '—'
      return h(resolveComponent('UBadge'), { color: getTimeCategoryColor(time), variant: 'subtle' }, () => time)
    }
  },
  {
    accessorKey: 'environment',
    header: ({ column }) => getSortableHeader(column, 'Environment'),
    cell: ({ row }) => {
      const env = row.original.environment
      if (!env) return h('span', { class: 'text-(--ui-text-muted)' }, 'all')
      return h(resolveComponent('UBadge'), { color: getEnvironmentColor(env), variant: 'subtle' }, () => env)
    }
  },
  {
    accessorKey: 'approvedAt',
    header: ({ column }) => getSortableHeader(column, 'Approved'),
    cell: ({ row }) => {
      const date = row.original.approvedAt
      return date ? formatDate(date) : '—'
    }
  },
  {
    accessorKey: 'approvedBy',
    header: ({ column }) => getSortableHeader(column, 'By'),
    cell: ({ row }) => row.original.approvedBy || '—'
  },
  {
    accessorKey: 'notes',
    header: ({ column }) => getSortableHeader(column, 'Notes'),
    cell: ({ row }) => row.original.notes || '—'
  }
]

function getVersionViolation(version: string): ConstraintRef | null {
  if (!tech.value?.constraints) return null
  const cleaned = semver.coerce(version)
  if (!cleaned) return null
  for (const vc of tech.value.constraints) {
    if (vc.status === 'active' && vc.versionRange) {
      if (!semver.satisfies(cleaned, vc.versionRange)) {
        return vc
      }
    }
  }
  return null
}

function getComponentsForVersion(version: string): number {
  return tech.value?.components?.filter(c => c.version === version).length ?? 0
}

function getViolationCountForVersion(version: string): number {
  if (!tech.value?.constraints) return 0
  const cleaned = semver.coerce(version)
  if (!cleaned) return 0
  let count = 0
  for (const vc of tech.value.constraints) {
    if (vc.status === 'active' && vc.versionRange) {
      if (!semver.satisfies(cleaned, vc.versionRange)) {
        count++
      }
    }
  }
  return count
}

const componentColumns: TableColumn<ComponentRef>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => getSortableHeader(column, 'Name'),
    cell: ({ row }) => h('strong', {}, row.getValue('name') as string)
  },
  {
    accessorKey: 'version',
    header: ({ column }) => getSortableHeader(column, 'Version'),
    cell: ({ row }) => h('code', {}, row.getValue('version') as string)
  },
  {
    accessorKey: 'packageManager',
    header: ({ column }) => getSortableHeader(column, 'Package Manager'),
    cell: ({ row }) => {
      const pm = row.getValue('packageManager') as string | null
      if (!pm) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h('span', { class: 'flex items-center gap-1' }, [
        h(resolveComponent('UIcon'), { name: pmIcon(pm), style: { color: pmColor(pm) }, class: 'size-4 flex-shrink-0' }),
        pm,
      ])
    },
  },
  {
    id: 'violation',
    header: '',
    meta: { class: { th: 'w-10' } },
    cell: ({ row }) => {
      const violation = getVersionViolation(row.original.version)
      if (!violation) return ''
      return h(resolveComponent('UTooltip'), {
        text: `Violates "${violation.name}" (${violation.versionRange})`
      }, () => h(resolveComponent('UIcon'), {
        name: 'i-lucide-alert-triangle',
        class: 'text-(--ui-error) size-5'
      }))
    }
  }
]

const versionRiskColumns: TableColumn<VersionDetail>[] = [
  {
    accessorKey: 'version',
    header: ({ column }) => getSortableHeader(column, 'Version'),
    cell: ({ row }) => h('code', {}, row.getValue('version') as string)
  },
  {
    id: 'components',
    header: 'Components Using',
    cell: ({ row }) => getComponentsForVersion(row.getValue('version') as string).toString()
  },
  {
    id: 'lifecycle',
    header: 'Lifecycle',
    cell: ({ row }) => {
      const status = row.original.lifecycle?.status
      return h(resolveComponent('UBadge'), { color: getEolColor(status), variant: 'subtle' }, () => getEolLabel(status))
    }
  },
  {
    id: 'violations',
    header: 'Violations',
    cell: ({ row }) => {
      const count = getViolationCountForVersion(row.getValue('version') as string)
      if (count === 0) return '—'
      return h(resolveComponent('UBadge'), { color: 'error', variant: 'subtle' }, () => count.toString())
    }
  },
  {
    id: 'risk',
    header: 'Risk',
    meta: { class: { th: 'w-12' } },
    cell: ({ row }) => {
      const violationCount = getViolationCountForVersion(row.getValue('version') as string)
      const lifecycle = row.original.lifecycle?.status

      let icon = 'i-lucide-check'
      let color = 'text-(--ui-success)'

      if (violationCount > 0) {
        icon = 'i-lucide-alert-circle'
        color = 'text-(--ui-error)'
      } else if (lifecycle === 'approaching_eol') {
        icon = 'i-lucide-alert-triangle'
        color = 'text-(--ui-warning)'
      } else if (lifecycle === 'unsupported') {
        icon = 'i-lucide-x-circle'
        color = 'text-(--ui-error)'
      }

      return h(resolveComponent('UIcon'), { name: icon, class: `${color} size-5` })
    }
  }
]

const { data, pending, error, refresh } = await useFetch<TechnologyResponse>(() => `/api/technologies/${encodeURIComponent(route.params.name as string)}`)

const tech = computed(() => data.value?.data || null)

const versionRows = computed<VersionDetail[]>(() => {
  const lifecycles = new Map((tech.value?.versionLifecycles || []).map(item => [item.version, item.lifecycle]))
  return (tech.value?.versions || []).map(version => ({
    ...version,
    lifecycle: lifecycles.get(version.version) || null
  }))
})

const distinctVersionCount = computed(() => tech.value?.versions?.length ?? 0)

const versionRiskData = computed<VersionDetail[]>(() => {
  // If technology has explicit versions, use those
  if (versionRows.value.length > 0) {
    return versionRows.value
  }

  // Otherwise, extract unique versions from components
  const componentVersionMap = new Map<string, VersionDetail>()
  for (const component of tech.value?.components || []) {
    if (!componentVersionMap.has(component.version)) {
      componentVersionMap.set(component.version, {
        version: component.version,
        releaseDate: null,
        eolDate: null,
        approved: null,
        notes: null,
        lifecycle: null
      })
    }
  }
  return Array.from(componentVersionMap.values()).sort((a, b) =>
    a.version.localeCompare(b.version, undefined, { numeric: true })
  )
})

const timeCategory = computed(() => {
  const approval = tech.value?.technologyApprovals?.[0]
  return approval?.time || null
})

const statItems = computed(() => [
  { label: 'Versions', value: distinctVersionCount.value },
  { label: 'Components', value: tech.value?.components?.length || 0 },
  { label: 'Systems', value: tech.value?.systems?.length || 0 }
])

const basicInfoItems = computed(() => [
  { key: 'type', label: 'Type', value: tech.value?.type },
  { key: 'domain', label: 'Domain', value: tech.value?.domain },
  { key: 'vendor', label: 'Vendor', value: tech.value?.vendor },
  { key: 'lastReviewed', label: 'Last Reviewed', value: tech.value?.lastReviewed ? formatDate(tech.value.lastReviewed) : null }
])

// Approval modal state
const approvalModalOpen = ref(false)
const approvalSubmitting = ref(false)
const approvalError = ref('')
const approvalForm = ref({
  teamName: '',
  time: '',
  environment: null as string | null,
  notes: ''
})

const teamSelectItems = computed(() =>
  userTeams.value.map(name => ({ label: name, value: name }))
)

const timeItems = [
  { label: 'Invest — strategic, worth continued investment', value: 'invest' },
  { label: 'Tolerate — keep running, minimize investment', value: 'tolerate' },
  { label: 'Migrate — move to a newer alternative', value: 'migrate' },
  { label: 'Eliminate — phase out and decommission', value: 'eliminate' }
]

const environmentItems = [
  { label: 'All environments', value: null },
  { label: 'dev', value: 'dev' },
  { label: 'test', value: 'test' },
  { label: 'staging', value: 'staging' },
  { label: 'prod', value: 'prod' }
]

const existingApproval = computed(() => {
  if (!approvalForm.value.teamName || !tech.value?.technologyApprovals) return null
  const env = approvalForm.value.environment
  return tech.value.technologyApprovals.find(a =>
    a.team === approvalForm.value.teamName &&
    (env ? a.environment === env : !a.environment)
  ) || null
})

function onTeamChange() {
  const existing = existingApproval.value
  if (existing) {
    approvalForm.value.time = existing.time || ''
    approvalForm.value.notes = existing.notes || ''
  } else {
    approvalForm.value.time = ''
    approvalForm.value.notes = ''
  }
}

function openApprovalModal() {
  approvalError.value = ''
  approvalForm.value = {
    teamName: userTeams.value.length === 1 ? userTeams.value[0]! : '',
    time: '',
    environment: null,
    notes: ''
  }
  // Pre-fill if single team and existing approval
  if (userTeams.value.length === 1) {
    onTeamChange()
  }
  approvalModalOpen.value = true
}

async function submitApproval() {
  approvalSubmitting.value = true
  approvalError.value = ''

  try {
    await $fetch(`/api/technologies/${encodeURIComponent(tech.value!.name)}/approvals`, {
      method: 'POST',
      body: {
        teamName: approvalForm.value.teamName,
        time: approvalForm.value.time,
        environment: approvalForm.value.environment || null,
        notes: approvalForm.value.notes || undefined
      }
    })
    approvalModalOpen.value = false
    await refresh()
  } catch (err: unknown) {
    const error = err as { data?: { message?: string }; message?: string }
    approvalError.value = error.data?.message || error.message || 'Failed to set approval'
  } finally {
    approvalSubmitting.value = false
  }
}

useHead({
  title: computed(() => tech.value ? `${tech.value.name} - Polaris` : 'Technology - Polaris')
})
</script>
