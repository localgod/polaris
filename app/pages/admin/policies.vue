<template>
  <div class="space-y-6">
    <UPageHeader
      title="Policy Review"
      description="Technologies that need an org-level TIME policy"
    />

    <!-- Conflicting legacy approvals -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-semibold">Migration Review Queue</h2>
          <UBadge v-if="reviewQueue.length > 0" color="warning" variant="subtle">{{ reviewQueue.length }}</UBadge>
        </div>
      </template>
      <USkeleton v-if="queuePending" class="h-24 w-full" />
      <UAlert
        v-else-if="queueError"
        color="error"
        variant="subtle"
        icon="i-lucide-alert-circle"
        :description="queueError.message"
      />
      <div v-else-if="reviewQueue.length === 0" class="text-sm text-(--ui-text-muted) py-4">
        No conflicting approvals from migration.
      </div>
      <UTable
        v-else
        :data="reviewQueue"
        :columns="queueColumns"
      />
    </UCard>

    <!-- Technologies without an active policy -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <h2 class="text-lg font-semibold">Unclassified Technologies</h2>
          <UBadge v-if="unclassified.length > 0" color="error" variant="subtle">{{ unclassified.length }}</UBadge>
        </div>
      </template>
      <p class="text-sm text-(--ui-text-muted) mb-4">
        These technologies have no active org-level policy and count as compliance violations.
        Propose and activate a policy from each technology's detail page.
      </p>
      <USkeleton v-if="radarPending" class="h-24 w-full" />
      <div v-else-if="unclassified.length === 0" class="text-sm text-(--ui-text-muted) py-4">
        All technologies have an active policy.
      </div>
      <UTable
        v-else
        :data="unclassified"
        :columns="unclassifiedColumns"
      />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse } from '~~/types/api'
import type { RadarTechnology } from '~~/server/services/technology.service'

interface ReviewQueueItem {
  id: string
  technologyName: string
  conflictingValues: string[]
  reviewedAt: string | null
  createdAt: string
  technologyExists: boolean
}

interface ReviewQueueResponse { success: boolean; data: ReviewQueueItem[] }

const { data: queueData, pending: queuePending, error: queueError } = useFetch<ReviewQueueResponse>(
  '/api/admin/policies/review-queue'
)
const reviewQueue = computed(() => queueData.value?.data ?? [])

const { data: radarData, pending: radarPending } = useFetch<ApiResponse<RadarTechnology>>(
  '/api/technologies/radar'
)
const unclassified = computed(() =>
  (radarData.value?.data ?? []).filter(t => !t.policyId)
)

const queueColumns: TableColumn<ReviewQueueItem>[] = [
  {
    accessorKey: 'technologyName',
    header: 'Technology',
    cell: ({ row }) => {
      const name = row.original.technologyName
      if (!row.original.technologyExists) return name
      return h(resolveComponent('NuxtLink'), {
        to: `/technologies/${encodeURIComponent(name)}`,
        class: 'font-medium hover:underline'
      }, () => name)
    }
  },
  {
    accessorKey: 'conflictingValues',
    header: 'Conflicting TIME values',
    cell: ({ row }) => {
      const values = row.original.conflictingValues
      if (!values?.length) return h('span', { class: 'text-(--ui-text-muted)' }, 'No approvals')
      return h('div', { class: 'flex gap-1 flex-wrap' },
        values.map(v => h(resolveComponent('UBadge'), { key: v, color: getTimeCategoryColor(v), variant: 'subtle', size: 'sm' }, () => v))
      )
    }
  },
  {
    accessorKey: 'createdAt',
    header: 'Flagged',
    cell: ({ row }) => {
      const date = row.original.createdAt
      return date ? new Date(date).toLocaleDateString() : '—'
    }
  },
  {
    id: 'actions',
    header: '',
    meta: { class: { th: 'w-10', td: 'text-right' } },
    cell: ({ row }) => {
      if (!row.original.technologyExists) return null
      return h(resolveComponent('UButton'), {
        label: 'Review',
        size: 'xs',
        variant: 'outline',
        to: `/technologies/${encodeURIComponent(row.original.technologyName)}`
      })
    }
  }
]

const unclassifiedColumns: TableColumn<RadarTechnology>[] = [
  {
    accessorKey: 'name',
    header: 'Technology',
    cell: ({ row }) => h(resolveComponent('NuxtLink'), {
      to: `/technologies/${encodeURIComponent(row.original.name)}`,
      class: 'font-medium hover:underline'
    }, () => row.original.name)
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.original.type
      if (!type) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(resolveComponent('UBadge'), { color: 'neutral', variant: 'subtle', size: 'sm' }, () => type)
    }
  },
  {
    accessorKey: 'domain',
    header: 'Domain',
    cell: ({ row }) => {
      const domain = row.original.domain
      if (!domain) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(resolveComponent('UBadge'), { color: 'info', variant: 'subtle', size: 'sm' }, () => domain)
    }
  },
  {
    id: 'actions',
    header: '',
    meta: { class: { th: 'w-10', td: 'text-right' } },
    cell: ({ row }) => h(resolveComponent('UButton'), {
      label: 'Propose Policy',
      size: 'xs',
      variant: 'outline',
      to: `/technologies/${encodeURIComponent(row.original.name)}`
    })
  }
]

useHead({ title: 'Policy Review - Admin - Polaris' })
</script>
