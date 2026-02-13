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
          :links="[{ label: 'Back to Technologies', to: '/technologies', icon: 'i-lucide-arrow-left', variant: 'outline' as const }]"
        />
        <div class="flex gap-2">
          <UBadge v-if="tech.category" color="neutral" variant="subtle">
            {{ tech.category }}
          </UBadge>
          <UBadge v-if="timeCategory" :color="getTimeCategoryColor(timeCategory)" variant="subtle">
            {{ timeCategory }}
          </UBadge>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Versions</p>
            <p class="text-2xl font-bold mt-1">{{ tech.versions?.length || 0 }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Components</p>
            <p class="text-2xl font-bold mt-1">{{ tech.components?.length || 0 }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Systems</p>
            <p class="text-2xl font-bold mt-1">{{ tech.systems?.length || 0 }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Owner</p>
            <p class="text-2xl font-bold mt-1">
              <NuxtLink
                v-if="tech.ownerTeamName"
                :to="`/teams/${encodeURIComponent(tech.ownerTeamName)}`"
                class="hover:underline"
              >
                {{ tech.ownerTeamName }}
              </NuxtLink>
              <span v-else class="text-(--ui-text-muted)">—</span>
            </p>
          </div>
        </UCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Basic Information</h2>
          </template>
          <div class="space-y-3">
            <div>
              <span class="text-sm text-(--ui-text-muted)">Category</span>
              <p class="font-medium">{{ tech.category || '—' }}</p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">Vendor</span>
              <p class="font-medium">{{ tech.vendor || '—' }}</p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">Approved Version Range</span>
              <p class="font-medium">
                <code v-if="tech.approvedVersionRange">{{ tech.approvedVersionRange }}</code>
                <span v-else class="text-(--ui-text-muted)">—</span>
              </p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">Last Reviewed</span>
              <p class="font-medium">{{ tech.lastReviewed ? formatDate(tech.lastReviewed) : '—' }}</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Governance</h2>
          </template>
          <div class="space-y-3">
            <div>
              <span class="text-sm text-(--ui-text-muted)">Owner Team</span>
              <p v-if="tech.ownerTeamName" class="font-medium">
                <NuxtLink :to="`/teams/${encodeURIComponent(tech.ownerTeamName)}`" class="hover:underline">
                  {{ tech.ownerTeamName }}
                </NuxtLink>
                <span v-if="tech.ownerTeamEmail" class="text-sm text-(--ui-text-muted) ml-2">{{ tech.ownerTeamEmail }}</span>
              </p>
              <p v-else class="text-(--ui-text-muted)">No owner assigned</p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">Risk Level</span>
              <p class="font-medium">{{ tech.riskLevel || '—' }}</p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">TIME Category</span>
              <p class="font-medium">
                <UBadge v-if="timeCategory" :color="getTimeCategoryColor(timeCategory)" variant="subtle">
                  {{ timeCategory }}
                </UBadge>
                <span v-else class="text-(--ui-text-muted)">—</span>
              </p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Technology Approvals -->
      <UCard v-if="tech.technologyApprovals && tech.technologyApprovals.length > 0">
        <template #header>
          <h2 class="text-lg font-semibold">Approvals ({{ tech.technologyApprovals.length }})</h2>
        </template>
        <UTable :data="tech.technologyApprovals" :columns="approvalColumns" class="flex-1" />
      </UCard>

      <!-- Versions -->
      <UCard v-if="tech.versions && tech.versions.length > 0">
        <template #header>
          <h2 class="text-lg font-semibold">Versions ({{ tech.versions.length }})</h2>
        </template>
        <UTable :data="tech.versions" :columns="versionColumns" class="flex-1" />
      </UCard>

      <!-- Components -->
      <UCard v-if="tech.components && tech.components.length > 0">
        <template #header>
          <h2 class="text-lg font-semibold">Components ({{ tech.components.length }})</h2>
        </template>
        <UTable :data="tech.components" :columns="componentColumns" class="flex-1" />
      </UCard>

      <!-- Systems -->
      <UCard v-if="tech.systems && tech.systems.length > 0">
        <template #header>
          <h2 class="text-lg font-semibold">Systems ({{ tech.systems.length }})</h2>
        </template>
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
      </UCard>

      <!-- Policies -->
      <UCard v-if="tech.policies && tech.policies.length > 0">
        <template #header>
          <h2 class="text-lg font-semibold">Policies ({{ tech.policies.length }})</h2>
        </template>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="policy in tech.policies"
            :key="policy.name"
            :label="policy.name"
            :to="`/policies/${encodeURIComponent(policy.name)}`"
            variant="subtle"
            color="neutral"
            size="sm"
          >
            <template #trailing>
              <UBadge :color="getSeverityColor(policy.severity)" variant="subtle" size="xs">
                {{ policy.severity }}
              </UBadge>
            </template>
          </UButton>
        </div>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { TechnologyApproval } from '~~/types/api'

const route = useRoute()

interface VersionDetail {
  version: string
  releaseDate: string | null
  eolDate: string | null
  approved: boolean
  cvssScore: number | null
  notes: string | null
}

interface ComponentRef {
  name: string
  version: string
  packageManager: string | null
}

interface PolicyRef {
  name: string
  severity: string
  ruleType: string
}

interface TechnologyDetailData {
  name: string
  category: string
  vendor: string | null
  approvedVersionRange: string | null
  ownerTeam: string | null
  riskLevel: string | null
  lastReviewed: string | null
  ownerTeamName: string | null
  ownerTeamEmail: string | null
  versions: VersionDetail[]
  components: ComponentRef[]
  systems: string[]
  policies: PolicyRef[]
  technologyApprovals: TechnologyApproval[]
  versionApprovals: TechnologyApproval[]
}

interface TechnologyResponse {
  success: boolean
  data: TechnologyDetailData
}

function getTimeCategoryColor(category: string): 'success' | 'warning' | 'error' | 'neutral' {
  const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    invest: 'success',
    tolerate: 'warning',
    migrate: 'warning',
    eliminate: 'error'
  }
  return colors[category?.toLowerCase()] || 'neutral'
}

function getSeverityColor(severity: string): 'error' | 'warning' | 'success' | 'neutral' {
  const colors: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error',
    error: 'error',
    warning: 'warning',
    info: 'neutral'
  }
  return colors[severity?.toLowerCase()] || 'neutral'
}

function formatDate(dateString: string): string {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleDateString()
}

const versionColumns: TableColumn<VersionDetail>[] = [
  {
    accessorKey: 'version',
    header: 'Version',
    cell: ({ row }) => h('code', {}, row.getValue('version') as string)
  },
  {
    accessorKey: 'approved',
    header: 'Status',
    cell: ({ row }) => {
      const approved = row.getValue('approved') as boolean
      const color = approved ? 'success' : 'warning'
      const label = approved ? 'approved' : 'pending'
      return h(resolveComponent('UBadge'), { color, variant: 'subtle' }, () => label)
    }
  },
  {
    accessorKey: 'releaseDate',
    header: 'Released',
    cell: ({ row }) => {
      const date = row.getValue('releaseDate') as string | null
      return date ? formatDate(date) : '—'
    }
  },
  {
    accessorKey: 'eolDate',
    header: 'End of Life',
    cell: ({ row }) => {
      const date = row.getValue('eolDate') as string | null
      return date ? formatDate(date) : '—'
    }
  },
  {
    accessorKey: 'notes',
    header: 'Notes',
    cell: ({ row }) => {
      const notes = row.getValue('notes') as string | null
      return notes || '—'
    }
  }
]

const approvalColumns: TableColumn<TechnologyApproval>[] = [
  {
    accessorKey: 'team',
    header: 'Team',
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
    header: 'TIME',
    cell: ({ row }) => {
      const time = row.getValue('time') as string | null
      if (!time) return '—'
      return h(resolveComponent('UBadge'), { color: getTimeCategoryColor(time), variant: 'subtle' }, () => time)
    }
  },
  {
    accessorKey: 'versionConstraint',
    header: 'Version Constraint',
    cell: ({ row }) => {
      const vc = row.original.versionConstraint
      return vc ? h('code', {}, vc) : '—'
    }
  },
  {
    accessorKey: 'approvedAt',
    header: 'Approved',
    cell: ({ row }) => {
      const date = row.original.approvedAt
      return date ? formatDate(date) : '—'
    }
  },
  {
    accessorKey: 'approvedBy',
    header: 'By',
    cell: ({ row }) => row.original.approvedBy || '—'
  },
  {
    accessorKey: 'notes',
    header: 'Notes',
    cell: ({ row }) => row.original.notes || '—'
  }
]

const componentColumns: TableColumn<ComponentRef>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => h('strong', {}, row.getValue('name') as string)
  },
  {
    accessorKey: 'version',
    header: 'Version',
    cell: ({ row }) => h('code', {}, row.getValue('version') as string)
  },
  {
    accessorKey: 'packageManager',
    header: 'Package Manager',
    cell: ({ row }) => row.getValue('packageManager') || '—'
  }
]

const { data, pending, error } = await useFetch<TechnologyResponse>(() => `/api/technologies/${encodeURIComponent(route.params.name as string)}`)

const tech = computed(() => data.value?.data || null)

const timeCategory = computed(() => {
  const approval = tech.value?.technologyApprovals?.[0]
  return approval?.time || null
})

useHead({
  title: computed(() => tech.value ? `${tech.value.name} - Polaris` : 'Technology - Polaris')
})
</script>
