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

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Technologies Owned</p>
            <p class="text-2xl font-bold mt-1">{{ data.data.technologyCount || 0 }}</p>
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
            <p class="text-sm text-(--ui-text-muted)">Members</p>
            <p class="text-2xl font-bold mt-1">{{ data.data.memberCount || 0 }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Responsibility</p>
            <p class="text-2xl font-bold mt-1">{{ data.data.responsibilityArea || '—' }}</p>
          </div>
        </UCard>
      </div>

      <UCard v-if="data.data.members && data.data.members.length > 0">
        <template #header>
          <h2 class="text-lg font-semibold">Members ({{ data.data.members.length }})</h2>
        </template>
        <UTable v-model:sorting="memberSorting" :data="data.data.members" :columns="memberColumns" class="flex-1" />
      </UCard>

      <UCard v-if="data.data.technologies && data.data.technologies.length > 0">
        <template #header>
          <h2 class="text-lg font-semibold">Technologies ({{ data.data.technologies.length }})</h2>
        </template>
        <UTable v-model:sorting="technologySorting" :data="data.data.technologies" :columns="technologyColumns" class="flex-1" />
      </UCard>

      <UCard v-if="data.data.systems && data.data.systems.length > 0">
        <template #header>
          <h2 class="text-lg font-semibold">Systems ({{ data.data.systems.length }})</h2>
        </template>
        <UTable v-model:sorting="systemSorting" :data="data.data.systems" :columns="systemColumns" class="flex-1" />
      </UCard>

      <UCard v-if="data.data.approvals && data.data.approvals.length > 0">
        <template #header>
          <h2 class="text-lg font-semibold">Technology Approvals ({{ data.data.approvals.length }})</h2>
        </template>
        <UTable v-model:sorting="approvalSorting" :data="data.data.approvals" :columns="approvalColumns" class="flex-1" />
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

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

function getTimeCategoryColor(category: string): 'success' | 'warning' | 'error' | 'neutral' {
  const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    invest: 'success',
    tolerate: 'warning',
    migrate: 'warning',
    eliminate: 'error'
  }
  return colors[category?.toLowerCase()] || 'neutral'
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

useHead({
  title: computed(() => data.value?.data ? `${data.value.data.name} - Polaris` : 'Team - Polaris')
})
</script>
