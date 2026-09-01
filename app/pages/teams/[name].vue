<template>
  <div class="space-y-6">
    <USkeleton v-if="pending" class="h-96 w-full" />

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Error Loading Team"
      :description="error.message"
    >
      <template #actions>
        <UButton label="Back to Teams" to="/teams" variant="outline" />
      </template>
    </UAlert>

    <template v-else-if="data?.data">
      <UBreadcrumb :items="[{ label: 'Teams', to: '/teams' }, { label: data.data.name }]" />
      <UPageHeader
        :title="data.data.name"
        :description="data.data.description"
        :links="[{ label: 'Back to Teams', to: '/teams', icon: 'i-lucide-arrow-left', variant: 'outline' as const }]"
      />
      <p v-if="data.data.responsibilityArea" class="text-sm text-(--ui-text-muted) -mt-4">
        Responsibility: <span class="text-(--ui-text)">{{ data.data.responsibilityArea }}</span>
      </p>

      <EntityStatStrip :items="statItems" />

      <ComplianceScorecard v-if="scorecardData?.data" :scorecard="scorecardData.data" />

      <UCard>
        <UTabs v-model="activeTab" :items="tabItems">
          <template #members>
            <UTable v-model:sorting="memberSorting" :data="data.data.members" :columns="memberColumns" class="mt-3">
              <template #empty>
                <p class="text-sm text-(--ui-text-muted) py-4 text-center">No members.</p>
              </template>
            </UTable>
          </template>
          <template #technologies>
            <UTable v-model:sorting="technologySorting" :data="data.data.technologies" :columns="technologyColumns" class="mt-3">
              <template #empty>
                <p class="text-sm text-(--ui-text-muted) py-4 text-center">No technologies owned.</p>
              </template>
            </UTable>
          </template>
          <template #systems>
            <UTable v-model:sorting="systemSorting" :data="data.data.systems" :columns="systemColumns" class="mt-3">
              <template #empty>
                <p class="text-sm text-(--ui-text-muted) py-4 text-center">No systems.</p>
              </template>
            </UTable>
          </template>
        </UTabs>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Scorecard } from '~~/types/api'

const { getSortableHeader } = useSortableTable()
const memberSorting = ref([])
const technologySorting = ref([])
const systemSorting = ref([])

const route = useRoute()
const router = useRouter()

interface Member {
  name: string
  email: string
  role: string
}

interface Technology {
  name: string
  type: string
  timeCategory: string
  relationship: string
}

interface System {
  name: string
  businessCriticality: string
  environment: string
}

interface TeamDetail {
  name: string
  description: string
  responsibilityArea: string
  technologyCount: number
  systemCount: number
  memberCount: number
  members: Member[]
  technologies: Technology[]
  systems: System[]
}

interface TeamResponse {
  success: boolean
  data: TeamDetail
}

interface ScorecardResponse {
  success: boolean
  data: Scorecard
}

const memberColumns: TableColumn<Member>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => getSortableHeader(column, 'Name')
  },
  {
    accessorKey: 'email',
    header: ({ column }) => getSortableHeader(column, 'Email')
  },
  {
    accessorKey: 'role',
    header: ({ column }) => getSortableHeader(column, 'Role'),
    cell: ({ row }) => {
      const role = row.getValue('role') as string
      return h(resolveComponent('UBadge'), { color: 'neutral', variant: 'subtle' }, () => role)
    }
  }
]

const technologyColumns: TableColumn<Technology>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => getSortableHeader(column, 'Name'),
    cell: ({ row }) => {
      const tech = row.original
      return h(resolveComponent('NuxtLink'), {
        to: `/technologies/${encodeURIComponent(tech.name)}`,
        class: 'font-medium hover:underline'
      }, () => tech.name)
    }
  },
  {
    accessorKey: 'type',
    header: ({ column }) => getSortableHeader(column, 'Type')
  },
  {
    accessorKey: 'timeCategory',
    header: ({ column }) => getSortableHeader(column, 'TIME'),
    cell: ({ row }) => {
      const cat = row.getValue('timeCategory') as string
      if (!cat) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(resolveComponent('UBadge'), { color: getTimeCategoryColor(cat), variant: 'subtle' }, () => cat)
    }
  },
  {
    accessorKey: 'relationship',
    header: ({ column }) => getSortableHeader(column, 'Relationship')
  }
]

const systemColumns: TableColumn<System>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => getSortableHeader(column, 'Name'),
    cell: ({ row }) => {
      const sys = row.original
      return h(resolveComponent('NuxtLink'), {
        to: `/systems/${encodeURIComponent(sys.name)}`,
        class: 'font-medium hover:underline'
      }, () => sys.name)
    }
  },
  {
    accessorKey: 'businessCriticality',
    header: ({ column }) => getSortableHeader(column, 'Criticality')
  },
  {
    accessorKey: 'environment',
    header: ({ column }) => getSortableHeader(column, 'Environment')
  }
]

const { data, pending, error } = await useFetch<TeamResponse>(() => `/api/teams/${encodeURIComponent(route.params.name as string)}`)

const { data: scorecardData } = useFetch<ScorecardResponse>(
  () => `/api/teams/${encodeURIComponent(route.params.name as string)}/scorecard`
)

const statItems = computed(() => [
  { label: 'Technologies Stewarded', value: data.value?.data?.technologyCount || 0 },
  { label: 'Systems', value: data.value?.data?.systemCount || 0 },
  { label: 'Members', value: data.value?.data?.memberCount || 0 }
])

const tabItems = computed(() => [
  { label: `Members (${data.value?.data?.members?.length ?? 0})`, slot: 'members' as const, value: 'members' },
  { label: `Technologies (${data.value?.data?.technologies?.length ?? 0})`, slot: 'technologies' as const, value: 'technologies' },
  { label: `Systems (${data.value?.data?.systems?.length ?? 0})`, slot: 'systems' as const, value: 'systems' }
])

const activeTab = ref((route.query.tab as string) || 'members')
watch(activeTab, (value) => {
  router.replace({ query: { ...route.query, tab: value } })
})

useHead({
  title: computed(() => data.value?.data ? `${data.value.data.name} - Polaris` : 'Team - Polaris')
})
</script>
