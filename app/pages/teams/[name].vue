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
        <UTabs :items="tabItems">
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
          <template #approvals>
            <UTable v-model:sorting="approvalSorting" :data="data.data.approvals" :columns="approvalColumns" class="mt-3">
              <template #empty>
                <p class="text-sm text-(--ui-text-muted) py-4 text-center">No technology approvals yet.</p>
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
const approvalSorting = ref([])

const route = useRoute()

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

interface Approval {
  technologyName: string
  timeCategory: string
  approvedAt: string
  approvedBy: string
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
  approvals: Approval[]
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

const approvalColumns: TableColumn<Approval>[] = [
  {
    accessorKey: 'technologyName',
    header: ({ column }) => getSortableHeader(column, 'Technology'),
    cell: ({ row }) => {
      const name = row.getValue('technologyName') as string
      return h(resolveComponent('NuxtLink'), {
        to: `/technologies/${encodeURIComponent(name)}`,
        class: 'font-medium hover:underline'
      }, () => name)
    }
  },
  {
    accessorKey: 'timeCategory',
    header: ({ column }) => getSortableHeader(column, 'TIME Category'),
    cell: ({ row }) => {
      const cat = row.getValue('timeCategory') as string
      if (!cat) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(resolveComponent('UBadge'), { color: getTimeCategoryColor(cat), variant: 'subtle' }, () => cat)
    }
  },
  {
    accessorKey: 'approvedAt',
    header: ({ column }) => getSortableHeader(column, 'Approved'),
    cell: ({ row }) => {
      const date = row.getValue('approvedAt') as string
      return date ? new Date(date).toLocaleDateString() : '—'
    }
  },
  {
    accessorKey: 'approvedBy',
    header: ({ column }) => getSortableHeader(column, 'Approved By')
  }
]

const { data, pending, error } = await useFetch<TeamResponse>(() => `/api/teams/${encodeURIComponent(route.params.name as string)}`)

const { data: scorecardData } = useFetch<ScorecardResponse>(
  () => `/api/teams/${encodeURIComponent(route.params.name as string)}/scorecard`
)

const statItems = computed(() => [
  { label: 'Technologies Owned', value: data.value?.data?.technologyCount || 0 },
  { label: 'Systems', value: data.value?.data?.systemCount || 0 },
  { label: 'Members', value: data.value?.data?.memberCount || 0 }
])

const tabItems = computed(() => [
  { label: `Members (${data.value?.data?.members?.length ?? 0})`, slot: 'members' as const },
  { label: `Technologies (${data.value?.data?.technologies?.length ?? 0})`, slot: 'technologies' as const },
  { label: `Systems (${data.value?.data?.systems?.length ?? 0})`, slot: 'systems' as const },
  { label: `Approvals (${data.value?.data?.approvals?.length ?? 0})`, slot: 'approvals' as const }
])

useHead({
  title: computed(() => data.value?.data ? `${data.value.data.name} - Polaris` : 'Team - Polaris')
})
</script>
