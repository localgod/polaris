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
      <UBreadcrumb :items="[{ label: 'Technologies', to: '/technologies' }, { label: tech.name }]" />
      <div class="flex items-center justify-between gap-3">
        <UPageHeader
          :title="tech.name"
          :links="[
            { label: 'Back to Technologies', to: '/technologies', icon: 'i-lucide-arrow-left', variant: 'outline' as const },
            { label: 'View Impact Graph', to: `/technologies/${encodeURIComponent(tech.name)}/impact`, icon: 'i-lucide-share-2', variant: 'outline' as const },
          ]"
        />
        <USwitch v-model="directOnly" label="Direct only" size="sm" />
      </div>

      <EntityStatStrip :items="statItems" />

      <UCard>
        <template #header>
          <h2 class="text-lg font-semibold">Basic Information</h2>
        </template>
        <EntityDescriptionList :items="basicInfoItems">
          <template #packageManager>
            <div v-if="packageManagers.length > 0" class="flex flex-wrap items-center gap-2 mt-0.5">
              <span v-for="pm in packageManagers" :key="pm" class="flex items-center gap-1 font-medium">
                <UIcon :name="pmIcon(pm)" :style="{ color: pmColor(pm) }" class="size-4 flex-shrink-0" />
                {{ pm }}
              </span>
            </div>
            <p v-else class="font-medium mt-0.5">—</p>
          </template>
        </EntityDescriptionList>
      </UCard>

      <!-- Organization Policy -->
      <TechnologyPolicyPanel
        :technology-name="tech.name"
        :steward-team-name="tech.stewardTeamName"
        @refreshed="refresh()"
      />

      <!-- Version Risk, Versions, Version Constraints — kept in one card:
           version rows carry live violation warnings cross-referenced against
           Version Constraints (see getViolationCountForVersion), so these
           stay visible together rather than split behind tabs. The separate
           Components table was folded into Version Risk (Package Manager
           column) since the two were showing the same underlying rows. -->
      <UCard>
        <div class="divide-y divide-(--ui-border)">
          <div class="first:pt-0 last:pb-0 py-6">
            <h3 class="text-base font-semibold mb-3">Version Risk ({{ filteredVersionRiskData.length }})</h3>
            <UTable
              v-if="filteredVersionRiskData.length > 0"
              v-model:sorting="versionRiskSorting"
              :data="filteredVersionRiskData"
              :columns="versionRiskColumns"
              class="flex-1"
            />
            <div v-else-if="versionRiskData.length > 0" class="text-center text-(--ui-text-muted) py-8">
              {{ versionRiskData.length }} version(s) are only used as a transitive dependency. Turn off "Direct only" above to see them.
            </div>
            <div v-else class="text-center text-(--ui-text-muted) py-8">
              No versions found.
            </div>
          </div>

          <div v-if="tech.versions && tech.versions.length > 0" class="first:pt-0 last:pb-0 py-6">
            <h3 class="text-base font-semibold mb-3">Versions ({{ tech.versions.length }})</h3>
            <UTable v-model:sorting="versionSorting" :data="versionRows" :columns="versionColumns" class="flex-1" />
          </div>

          <div class="first:pt-0 last:pb-0 py-6">
            <div class="flex justify-between items-center mb-3">
              <h3 class="text-base font-semibold">Version Constraints ({{ tech.constraints?.length || 0 }})</h3>
              <UButton
                v-if="isSuperuser"
                label="Add Constraint"
                icon="i-lucide-shield-plus"
                size="sm"
                variant="outline"
                @click="openConstraintModal()"
              />
            </div>
            <div v-if="tech.constraints && tech.constraints.length > 0" class="flex flex-wrap gap-2">
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
            <p v-else class="text-sm text-(--ui-text-muted)">No version constraints yet.</p>
          </div>
        </div>
      </UCard>

      <!-- Add Version Constraint Modal -->
      <UModal v-model:open="constraintModalOpen">
        <template #header>
          <h3 class="text-lg font-semibold">Add Version Constraint for {{ tech.name }}</h3>
        </template>
        <template #body>
          <form class="space-y-4" @submit.prevent="submitConstraint">
            <UFormField label="Version Range" required>
              <UInput v-model="constraintForm.versionRange" placeholder="e.g. >=18.0.0 <20.0.0" class="w-full" autofocus />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Severity" required>
                <USelect v-model="constraintForm.severity" :items="constraintSeverityOptions" placeholder="Select severity" class="w-full" />
              </UFormField>
              <UFormField label="Scope" required>
                <USelect v-model="constraintForm.scope" :items="constraintScopeOptions" class="w-full" />
              </UFormField>
            </div>

            <UFormField v-if="constraintForm.scope === 'team'" label="Subject Team" required>
              <USelect v-model="constraintForm.subjectTeam" :items="constraintTeamOptions" placeholder="Select team" class="w-full" />
            </UFormField>

            <UFormField label="Name" required hint="Auto-generated — edit to customize">
              <UInput
                v-model="constraintForm.name"
                placeholder="e.g. typescript-min-version"
                class="w-full"
                @update:model-value="constraintNameEdited = true"
              />
            </UFormField>

            <UFormField label="Rationale">
              <UTextarea v-model="constraintForm.description" placeholder="Why does this constraint exist? (e.g. CVE-2024-XXXX, contractual requirement...)" class="w-full" />
            </UFormField>

            <UAlert
              v-if="constraintError"
              color="error"
              variant="subtle"
              icon="i-lucide-alert-circle"
              :description="constraintError"
            />
          </form>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton label="Cancel" color="neutral" variant="outline" @click="constraintModalOpen = false" />
            <UButton
              :label="isCreatingConstraint ? 'Creating...' : 'Create'"
              :loading="isCreatingConstraint"
              :disabled="!constraintForm.name || !constraintForm.severity || !constraintForm.versionRange"
              @click="submitConstraint"
            />
          </div>
        </template>
      </UModal>

      <!-- Systems -->
      <div v-if="tech.systems && tech.systems.length > 0">
        <h2 class="text-lg font-semibold mb-3">Systems ({{ visibleSystems.length }})</h2>
        <div v-if="visibleSystems.length > 0" class="flex flex-wrap gap-2">
          <div v-for="system in visibleSystems" :key="system.name" class="flex items-center gap-1">
            <UButton
              :label="system.name"
              :to="`/systems/${encodeURIComponent(system.name)}`"
              variant="subtle"
              color="neutral"
              size="sm"
            />
            <UBadge v-if="!directOnly" :color="system.isDirect ? 'primary' : 'neutral'" variant="subtle" size="sm">
              {{ system.isDirect ? 'Direct' : 'Transitive' }}
            </UBadge>
          </div>
        </div>
        <p v-else class="text-sm text-(--ui-text-muted)">
          {{ tech.systems.length }} use this only as a transitive dependency. Turn off "Direct only" above to see them.
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { EOLStatus, EOLStatusValue, TechnologyLifecycleSummary, TechnologyVersionLifecycle } from '~~/types/api'
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
const versionSorting = ref([])
const versionRiskSorting = ref([])

const route = useRoute()
const { isSuperuser } = useEffectiveRole()
const toast = useToast()

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
  isDirect: boolean
  systems: SystemUsage[]
}

interface ConstraintRef {
  name: string
  severity: string
  versionRange: string | null
  status: string | null
}

interface SystemUsage {
  name: string
  isDirect: boolean
}

interface TechnologyDetailData {
  name: string
  type: string
  domain: string | null
  vendor: string | null
  lastReviewed: string | null
  stewardTeamName: string | null
  stewardTeamEmail: string | null
  versions: VersionDetail[]
  components: ComponentRef[]
  systems: SystemUsage[]
  constraints: ConstraintRef[]
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

function getSystemsUsingVersion(version: string): number {
  const systems = (tech.value?.components ?? [])
    .filter(c => c.version === version)
    .flatMap(c => c.systems)
  const relevant = directOnly.value ? systems.filter(s => s.isDirect) : systems
  return new Set(relevant.map(s => s.name)).size
}

function isVersionDirect(version: string): boolean {
  return (tech.value?.components ?? []).some(c => c.version === version && c.isDirect)
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

const versionRiskColumns: TableColumn<VersionDetail>[] = [
  {
    accessorKey: 'version',
    header: ({ column }) => getSortableHeader(column, 'Version'),
    cell: ({ row }) => h('code', {}, row.getValue('version') as string)
  },
  {
    id: 'scope',
    header: 'Scope',
    cell: ({ row }) => {
      const direct = isVersionDirect(row.getValue('version') as string)
      return h(resolveComponent('UBadge'), { color: direct ? 'primary' : 'neutral', variant: 'subtle', size: 'sm' }, () => direct ? 'Direct' : 'Transitive')
    }
  },
  {
    id: 'systemsUsing',
    header: 'Systems Using',
    cell: ({ row }) => getSystemsUsingVersion(row.getValue('version') as string).toString()
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
    header: 'Constraint Violations',
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

// Page-wide toggle: defaults to showing only direct dependencies across every
// section below (Systems, Version Risk, the stat strip), with the option to
// switch on transitive dependencies when a full picture is needed.
const directOnly = ref(true)

const visibleSystems = computed(() => {
  const systems = tech.value?.systems || []
  return directOnly.value ? systems.filter(s => s.isDirect) : systems
})

const versionLifecycleMap = computed(() =>
  new Map((tech.value?.versionLifecycles || []).map(item => [item.version, item.lifecycle]))
)

const versionRows = computed<VersionDetail[]>(() =>
  (tech.value?.versions || []).map(version => ({
    ...version,
    lifecycle: versionLifecycleMap.value.get(version.version) || null
  }))
)

const versionRiskData = computed<VersionDetail[]>(() => {
  // If technology has explicit versions, use those
  if (versionRows.value.length > 0) {
    return versionRows.value
  }

  // Otherwise, extract unique versions from components — the backend computes
  // versionLifecycles for these derived versions too (see technology.service.ts),
  // so look them up the same way versionRows does above.
  const componentVersionMap = new Map<string, VersionDetail>()
  for (const component of tech.value?.components || []) {
    if (!componentVersionMap.has(component.version)) {
      componentVersionMap.set(component.version, {
        version: component.version,
        releaseDate: null,
        eolDate: null,
        approved: null,
        notes: null,
        lifecycle: versionLifecycleMap.value.get(component.version) || null
      })
    }
  }
  return Array.from(componentVersionMap.values()).sort((a, b) =>
    a.version.localeCompare(b.version, undefined, { numeric: true })
  )
})

const filteredVersionRiskData = computed(() =>
  directOnly.value ? versionRiskData.value.filter(v => isVersionDirect(v.version)) : versionRiskData.value
)

const statItems = computed(() => [
  { label: 'Versions', value: filteredVersionRiskData.value.length },
  {
    label: 'Components',
    value: directOnly.value
      ? tech.value?.components?.filter(c => c.isDirect).length || 0
      : tech.value?.components?.length || 0
  },
  { label: 'Systems', value: visibleSystems.value.length }
])

const packageManagers = computed(() => [
  ...new Set((tech.value?.components ?? []).map(c => c.packageManager).filter((pm): pm is string => !!pm))
])

const basicInfoItems = computed(() => [
  { key: 'type', label: 'Type', value: tech.value?.type },
  { key: 'domain', label: 'Domain', value: tech.value?.domain },
  { key: 'vendor', label: 'Vendor', value: tech.value?.vendor },
  { key: 'packageManager', label: 'Package Manager', value: packageManagers.value.join(', ') || null },
  { key: 'lastReviewed', label: 'Last Reviewed', value: tech.value?.lastReviewed ? formatDate(tech.value.lastReviewed) : null }
])

// Add Version Constraint modal
const constraintModalOpen = ref(false)
const isCreatingConstraint = ref(false)
const constraintError = ref('')
const constraintNameEdited = ref(false)
const constraintSeverityOptions = ['critical', 'error', 'warning', 'info']
const constraintScopeOptions = ['organization', 'team']
const constraintForm = ref({
  name: '',
  description: '',
  severity: undefined as string | undefined,
  scope: 'organization',
  subjectTeam: undefined as string | undefined,
  versionRange: ''
})

interface TeamsResponse { success: boolean; data: { name: string }[] }
const { data: constraintTeamsData } = useLazyFetch<TeamsResponse>('/api/teams', { key: 'tech-constraint-teams' })
const constraintTeamOptions = computed(() =>
  (constraintTeamsData.value?.data || []).map(t => t.name).sort()
)

watch(
  () => [constraintForm.value.severity, constraintForm.value.scope, constraintForm.value.subjectTeam, constraintForm.value.versionRange],
  () => {
    if (constraintNameEdited.value) return
    constraintForm.value.name = generateVersionConstraintName({
      technology: tech.value?.name,
      scope: constraintForm.value.scope,
      subjectTeam: constraintForm.value.subjectTeam,
      severity: constraintForm.value.severity,
      versionRange: constraintForm.value.versionRange
    })
  }
)

function openConstraintModal() {
  constraintError.value = ''
  constraintNameEdited.value = false
  constraintForm.value = {
    name: '',
    description: '',
    severity: undefined,
    scope: 'organization',
    subjectTeam: undefined,
    versionRange: ''
  }
  constraintModalOpen.value = true
}

async function submitConstraint() {
  isCreatingConstraint.value = true
  constraintError.value = ''
  try {
    await $fetch('/api/version-constraints', {
      method: 'POST',
      body: {
        name: constraintForm.value.name,
        description: constraintForm.value.description || undefined,
        severity: constraintForm.value.severity,
        scope: constraintForm.value.scope,
        subjectTeam: constraintForm.value.scope === 'team' ? constraintForm.value.subjectTeam : undefined,
        versionRange: constraintForm.value.versionRange,
        governsTechnology: tech.value!.name
      }
    })
    constraintModalOpen.value = false
    await refresh()
    toast.add({ title: 'Version constraint created', color: 'success' })
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    constraintError.value = err.data?.message || err.message || 'Failed to create version constraint'
  } finally {
    isCreatingConstraint.value = false
  }
}

useHead({
  title: computed(() => tech.value ? `${tech.value.name} - Polaris` : 'Technology - Polaris')
})
</script>
