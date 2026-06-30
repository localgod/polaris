<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-shield-alert" class="w-5 h-5 text-(--ui-text-muted)" />
          <h2 class="text-lg font-semibold">Issues</h2>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <UBadge v-if="visibleVulnerabilities.length" color="error" variant="subtle">
            {{ visibleVulnerabilities.length }} {{ visibleVulnerabilities.length === 1 ? 'vulnerability' : 'vulnerabilities' }}
          </UBadge>
          <UBadge v-if="visibleLicenseIssues.length" color="warning" variant="subtle">
            {{ visibleLicenseIssues.length }} license {{ visibleLicenseIssues.length === 1 ? 'issue' : 'issues' }}
          </UBadge>
          <UBadge v-if="visibleHealthIssues.length" color="warning" variant="subtle">
            {{ visibleHealthIssues.length }} health {{ visibleHealthIssues.length === 1 ? 'issue' : 'issues' }}
          </UBadge>
          <UButton
            :icon="showTransitive ? 'i-lucide-git-branch' : 'i-lucide-git-branch'"
            :label="showTransitive ? 'All dependencies' : 'Direct only'"
            :variant="showTransitive ? 'solid' : 'outline'"
            color="neutral"
            size="xs"
            @click="showTransitive = !showTransitive"
          />
        </div>
      </div>
    </template>

    <UAlert
      v-if="totalVisibleIssues === 0 && totalIssues === 0"
      color="success"
      variant="subtle"
      icon="i-lucide-shield-check"
      title="No active issues detected"
      description="No vulnerabilities, license violations, or health problems found for this system's components."
    />

    <UAlert
      v-else-if="totalVisibleIssues === 0 && totalIssues > 0"
      color="neutral"
      variant="subtle"
      icon="i-lucide-info"
      title="Issues exist in transitive dependencies only"
      description="Switch to 'All dependencies' above to see them."
    />

    <UTabs v-else :items="tabItems" class="-mt-1">
      <template #vulnerabilities>
        <UTable :data="visibleVulnerabilities" :columns="vulnColumns" class="mt-3">
          <template #empty>
            <p class="text-sm text-(--ui-text-muted) py-4 text-center">No vulnerabilities in this category.</p>
          </template>
        </UTable>
      </template>

      <template #licenses>
        <UTable :data="visibleLicenseIssues" :columns="licenseColumns" class="mt-3">
          <template #empty>
            <p class="text-sm text-(--ui-text-muted) py-4 text-center">No license issues in this category.</p>
          </template>
        </UTable>
      </template>

      <template #health>
        <UTable :data="visibleHealthIssues" :columns="healthColumns" class="mt-3">
          <template #empty>
            <p class="text-sm text-(--ui-text-muted) py-4 text-center">No health issues in this category.</p>
          </template>
        </UTable>
      </template>
    </UTabs>
  </UCard>
</template>

<script setup lang="ts">
import { h, resolveComponent, computed } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { encodeComponentKey } from '~~/utils/component-identity'

interface Advisory {
  id: string | null
  summary: string | null
  cvssScore: number | null
  publishedAt: string | null
}

interface DisallowedLicense {
  id: string | null
  name: string | null
  category: string | null
}

interface ComponentIssueRow {
  componentName: string
  componentVersion: string | null
  componentPurl: string | null
  isDirect: boolean
  advisories: Advisory[]
  disallowedLicenses: DisallowedLicense[]
  eolStatus: string | null
  eolDate: string | null
  isDeprecated: boolean
  maintenanceStatus: string | null
}

interface SystemIssues {
  vulnerabilities: ComponentIssueRow[]
  licenseIssues: ComponentIssueRow[]
  healthIssues: ComponentIssueRow[]
}

const props = defineProps<{ issues: SystemIssues }>()

const UBadge = resolveComponent('UBadge')
const NuxtLink = resolveComponent('NuxtLink')

const showTransitive = ref(false)

const visibleVulnerabilities = computed(() =>
  showTransitive.value ? props.issues.vulnerabilities : props.issues.vulnerabilities.filter(r => r.isDirect)
)
const visibleLicenseIssues = computed(() =>
  showTransitive.value ? props.issues.licenseIssues : props.issues.licenseIssues.filter(r => r.isDirect)
)
const visibleHealthIssues = computed(() =>
  showTransitive.value ? props.issues.healthIssues : props.issues.healthIssues.filter(r => r.isDirect)
)

const totalIssues = computed(() =>
  props.issues.vulnerabilities.length + props.issues.licenseIssues.length + props.issues.healthIssues.length
)
const totalVisibleIssues = computed(() =>
  visibleVulnerabilities.value.length + visibleLicenseIssues.value.length + visibleHealthIssues.value.length
)

const tabItems = computed(() => [
  {
    label: visibleVulnerabilities.value.length
      ? `Vulnerabilities (${visibleVulnerabilities.value.length})`
      : 'Vulnerabilities',
    slot: 'vulnerabilities' as const,
  },
  {
    label: visibleLicenseIssues.value.length
      ? `License Issues (${visibleLicenseIssues.value.length})`
      : 'License Issues',
    slot: 'licenses' as const,
  },
  {
    label: visibleHealthIssues.value.length
      ? `Health Issues (${visibleHealthIssues.value.length})`
      : 'Health Issues',
    slot: 'health' as const,
  },
])

function componentCell(row: ComponentIssueRow) {
  const purl = row.componentPurl
  const label = row.componentVersion
    ? `${row.componentName} ${row.componentVersion}`
    : row.componentName

  if (purl) {
    return h(NuxtLink, {
      to: `/components/${encodeComponentKey({ purl })}`,
      class: 'hover:underline font-medium'
    }, () => label)
  }
  return h('span', { class: 'font-medium' }, label)
}

function directCell(row: ComponentIssueRow) {
  return h(UBadge, {
    color: row.isDirect ? 'primary' : 'neutral',
    variant: 'subtle',
    size: 'sm'
  }, () => row.isDirect ? 'Direct' : 'Transitive')
}

const vulnColumns: TableColumn<ComponentIssueRow>[] = [
  {
    accessorKey: 'componentName',
    header: 'Component',
    cell: ({ row }) => componentCell(row.original),
  },
  {
    accessorKey: 'isDirect',
    header: 'Scope',
    cell: ({ row }) => directCell(row.original),
  },
  {
    id: 'advisories',
    header: 'Advisories',
    cell: ({ row }) => {
      const advisories = row.original.advisories
      if (!advisories.length) return h('span', { class: 'text-(--ui-text-muted)' }, '—')

      const topCvss = advisories
        .map(a => a.cvssScore)
        .filter((s): s is number => s !== null)
        .sort((a, b) => b - a)[0]

      return h('div', { class: 'flex flex-wrap items-center gap-2' }, [
        h(UBadge, {
          color: topCvss !== undefined ? (topCvss >= 9 ? 'error' : topCvss >= 7 ? 'warning' : 'neutral') : 'neutral',
          variant: 'subtle',
        }, () => advisories.length === 1 ? '1 advisory' : `${advisories.length} advisories`),
        topCvss !== undefined
          ? h('span', { class: 'text-sm text-(--ui-text-muted)' }, `CVSS ${topCvss.toFixed(1)}`)
          : null,
      ])
    },
  },
]

const licenseColumns: TableColumn<ComponentIssueRow>[] = [
  {
    accessorKey: 'componentName',
    header: 'Component',
    cell: ({ row }) => componentCell(row.original),
  },
  {
    accessorKey: 'isDirect',
    header: 'Scope',
    cell: ({ row }) => directCell(row.original),
  },
  {
    id: 'licenses',
    header: 'Disallowed Licenses',
    cell: ({ row }) => {
      const licenses = row.original.disallowedLicenses
      if (!licenses.length) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h('div', { class: 'flex flex-wrap gap-1' },
        licenses.map(l =>
          h(UBadge, { color: 'warning', variant: 'subtle', key: l.id ?? l.name ?? '' },
            () => l.id || l.name || 'Unknown'
          )
        )
      )
    },
  },
]

function maintenanceLabel(status: string | null): string {
  const labels: Record<string, string> = {
    stale: 'Stale',
    aging: 'Aging',
    stable: 'Stable',
    healthy: 'Healthy',
    unknown: 'Unknown',
  }
  return labels[status ?? ''] ?? status ?? '—'
}

const healthColumns: TableColumn<ComponentIssueRow>[] = [
  {
    accessorKey: 'componentName',
    header: 'Component',
    cell: ({ row }) => componentCell(row.original),
  },
  {
    accessorKey: 'isDirect',
    header: 'Scope',
    cell: ({ row }) => directCell(row.original),
  },
  {
    id: 'healthFlags',
    header: 'Issues',
    cell: ({ row }) => {
      const r = row.original
      const badges: ReturnType<typeof h>[] = []

      if (r.eolStatus === 'unsupported') {
        badges.push(h(UBadge, { color: 'error', variant: 'subtle' }, () => 'EOL'))
      }
      if (r.isDeprecated) {
        badges.push(h(UBadge, { color: 'warning', variant: 'subtle' }, () => 'Deprecated'))
      }
      if (r.maintenanceStatus === 'stale') {
        badges.push(h(UBadge, { color: 'warning', variant: 'subtle' }, () => maintenanceLabel(r.maintenanceStatus)))
      }

      return h('div', { class: 'flex flex-wrap gap-1' }, badges)
    },
  },
  {
    accessorKey: 'eolDate',
    header: 'EOL Date',
    cell: ({ row }) => {
      const d = row.original.eolDate
      if (!d) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      const formatted = new Date(d.includes('T') ? d : `${d}T00:00:00Z`)
        .toLocaleDateString(undefined, { timeZone: 'UTC' })
      return h('span', {}, formatted)
    },
  },
]
</script>
