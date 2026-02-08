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

    <template v-else-if="data?.data">
      <div class="flex justify-between items-center">
        <UPageHeader
          :title="data.data.name"
          :description="data.data.description"
          :links="[{ label: 'Back to Technologies', to: '/technologies', icon: 'i-lucide-arrow-left', variant: 'outline' as const }]"
        />
        <div class="flex gap-2">
          <UBadge v-if="data.data.type" color="neutral" variant="subtle">
            {{ data.data.type }}
          </UBadge>
          <UBadge v-if="data.data.timeCategory" :color="getTimeCategoryColor(data.data.timeCategory)" variant="subtle">
            {{ data.data.timeCategory }}
          </UBadge>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Versions</p>
            <p class="text-2xl font-bold mt-1">{{ data.data.versionCount || 0 }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Components</p>
            <p class="text-2xl font-bold mt-1">{{ data.data.componentCount || 0 }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Systems</p>
            <p class="text-2xl font-bold mt-1">{{ data.data.systemCount || 0 }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Steward</p>
            <p class="text-2xl font-bold mt-1">
              <NuxtLink
                v-if="data.data.stewardTeam"
                :to="`/teams/${encodeURIComponent(data.data.stewardTeam)}`"
                class="hover:underline"
              >
                {{ data.data.stewardTeam }}
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
              <span class="text-sm text-(--ui-text-muted)">Type</span>
              <p class="font-medium">{{ data.data.type || '—' }}</p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">TIME Category</span>
              <p class="font-medium">
                <UBadge v-if="data.data.timeCategory" :color="getTimeCategoryColor(data.data.timeCategory)" variant="subtle">
                  {{ data.data.timeCategory }}
                </UBadge>
                <span v-else class="text-(--ui-text-muted)">—</span>
              </p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">Version Range</span>
              <p class="font-medium">
                <code v-if="data.data.versionRange">{{ data.data.versionRange }}</code>
                <span v-else class="text-(--ui-text-muted)">—</span>
              </p>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Governance</h2>
          </template>
          <div class="space-y-3">
            <div>
              <span class="text-sm text-(--ui-text-muted)">Steward Team</span>
              <p v-if="data.data.stewardTeam" class="font-medium">
                <NuxtLink :to="`/teams/${encodeURIComponent(data.data.stewardTeam)}`" class="hover:underline">
                  {{ data.data.stewardTeam }}
                </NuxtLink>
              </p>
              <p v-else class="text-(--ui-text-muted)">No steward assigned</p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">Risk Level</span>
              <p class="font-medium">{{ data.data.riskLevel || '—' }}</p>
            </div>
          </div>
        </UCard>
      </div>

      <UCard v-if="data.data.versions && data.data.versions.length > 0">
        <template #header>
          <h2 class="text-lg font-semibold">Versions ({{ data.data.versions.length }})</h2>
        </template>
        <UTable :data="data.data.versions" :columns="versionColumns" class="flex-1" />
      </UCard>

      <UCard v-if="data.data.policies && data.data.policies.length > 0">
        <template #header>
          <h2 class="text-lg font-semibold">Policies ({{ data.data.policies.length }})</h2>
        </template>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="policy in data.data.policies"
            :key="policy"
            :label="policy"
            :to="`/policies/${encodeURIComponent(policy)}`"
            variant="subtle"
            color="neutral"
            size="sm"
          />
        </div>
      </UCard>

      <UCard v-if="data.data.approvedByTeams && data.data.approvedByTeams.length > 0">
        <template #header>
          <h2 class="text-lg font-semibold">Approved By Teams ({{ data.data.approvedByTeams.length }})</h2>
        </template>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="team in data.data.approvedByTeams"
            :key="team"
            :label="team"
            :to="`/teams/${encodeURIComponent(team)}`"
            variant="subtle"
            color="neutral"
            size="sm"
          />
        </div>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const route = useRoute()

interface Version {
  version: string
  releaseDate: string | null
  endOfLife: string | null
  status: string
}

interface TechnologyDetail {
  name: string
  description: string
  type: string
  timeCategory: string
  versionRange: string
  stewardTeam: string | null
  riskLevel: string
  versionCount: number
  componentCount: number
  systemCount: number
  versions: Version[]
  policies: string[]
  approvedByTeams: string[]
}

interface TechnologyResponse {
  success: boolean
  data: TechnologyDetail
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

const versionColumns: TableColumn<Version>[] = [
  {
    accessorKey: 'version',
    header: 'Version',
    cell: ({ row }) => h('code', {}, row.getValue('version') as string)
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      const color = status === 'active' ? 'success' : status === 'deprecated' ? 'warning' : 'neutral'
      return h(resolveComponent('UBadge'), { color, variant: 'subtle' }, () => status)
    }
  },
  {
    accessorKey: 'releaseDate',
    header: 'Released',
    cell: ({ row }) => {
      const date = row.getValue('releaseDate') as string | null
      return date ? new Date(date).toLocaleDateString() : '—'
    }
  },
  {
    accessorKey: 'endOfLife',
    header: 'End of Life',
    cell: ({ row }) => {
      const date = row.getValue('endOfLife') as string | null
      return date ? new Date(date).toLocaleDateString() : '—'
    }
  }
]

const { data, pending, error } = await useFetch<TechnologyResponse>(() => `/api/technologies/${encodeURIComponent(route.params.name as string)}`)

useHead({
  title: computed(() => data.value?.data ? `${data.value.data.name} - Polaris` : 'Technology - Polaris')
})
</script>
