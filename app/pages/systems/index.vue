<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <UPageHeader
        title="Systems"
        description="Deployable applications and services"
      />
      <UButton
        label="+ Create System"
        to="/systems/new"
        color="primary"
      />
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Error Loading Systems"
      :description="error.message"
    />

    <template v-else>
      <div v-if="data" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Total Systems</p>
            <p class="text-3xl font-bold mt-2">{{ data.count }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Critical</p>
            <p class="text-3xl font-bold text-(--ui-color-error-500) mt-2">{{ criticalityCounts.critical }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">High</p>
            <p class="text-3xl font-bold text-(--ui-color-warning-500) mt-2">{{ criticalityCounts.high }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Medium/Low</p>
            <p class="text-3xl font-bold text-(--ui-color-success-500) mt-2">{{ criticalityCounts.medium + criticalityCounts.low }}</p>
          </div>
        </UCard>
      </div>

      <UCard>
        <UTable
          :data="systems"
          :columns="columns"
          :loading="pending"
          class="flex-1"
        >
          <template #empty>
            <div class="text-center py-12">
              <UIcon name="i-lucide-inbox" class="text-5xl text-(--ui-text-muted)" />
              <h3 class="mt-4">No Systems Found</h3>
              <p class="text-(--ui-text-muted) mt-2">
                The database appears to be empty. Try running: <code>npm run seed</code>
              </p>
            </div>
          </template>
        </UTable>

        <div v-if="total > pageSize" class="flex justify-center border-t border-(--ui-border) pt-4 mt-4">
          <UPagination
            v-model:page="page"
            :total="total"
            :items-per-page="pageSize"
            :sibling-count="1"
            show-edges
          />
        </div>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

interface System {
  name: string
  domain: string
  ownerTeam: string | null
  businessCriticality: string
  environment: string
  componentCount: number
  repositoryCount: number
}

interface SystemsResponse {
  success: boolean
  data: System[]
  count: number
  total?: number
}

function getCriticalityColor(criticality: string): 'error' | 'warning' | 'success' | 'neutral' {
  const colors: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error',
    high: 'warning',
    medium: 'success',
    low: 'neutral'
  }
  return colors[criticality] || 'neutral'
}

const columns: TableColumn<System>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const system = row.original
      return h('div', {}, [
        h('strong', {}, system.name),
        h('p', { class: 'text-sm text-(--ui-text-muted)' }, system.domain)
      ])
    }
  },
  {
    accessorKey: 'businessCriticality',
    header: 'Criticality',
    cell: ({ row }) => {
      const criticality = row.getValue('businessCriticality') as string
      return h(resolveComponent('UBadge'), { color: getCriticalityColor(criticality), variant: 'subtle' }, () => criticality)
    }
  },
  { accessorKey: 'environment', header: 'Environment' },
  {
    accessorKey: 'ownerTeam',
    header: 'Owner',
    cell: ({ row }) => {
      const owner = row.getValue('ownerTeam') as string | null
      if (!owner) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h('span', { class: 'font-medium' }, owner)
    }
  },
  { accessorKey: 'componentCount', header: 'Components' },
  { accessorKey: 'repositoryCount', header: 'Repositories' },
  {
    id: 'actions',
    header: '',
    meta: { class: { th: 'w-10', td: 'text-right' } },
    cell: ({ row }) => {
      const system = row.original
      const items = [[
        { label: 'View Details', icon: 'i-lucide-eye', onSelect: () => navigateTo(`/systems/${encodeURIComponent(system.name)}`) },
        { label: 'Unmapped Components', icon: 'i-lucide-package-x', onSelect: () => navigateTo(`/systems/${encodeURIComponent(system.name)}/unmapped-components`) }
      ]]
      return h(resolveComponent('UDropdownMenu'), { items, content: { align: 'end' } }, {
        default: () => h(resolveComponent('UButton'), { icon: 'i-lucide-ellipsis-vertical', color: 'neutral', variant: 'ghost', size: 'sm' })
      })
    }
  }
]

const page = ref(1)
const pageSize = 20
const queryParams = computed(() => ({ limit: pageSize, offset: (page.value - 1) * pageSize }))

const { data, pending, error } = await useFetch<SystemsResponse>('/api/systems', { query: queryParams })

const systems = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

const criticalityCounts = computed(() => {
  if (!data.value?.data) return { critical: 0, high: 0, medium: 0, low: 0 }
  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  data.value.data.forEach(sys => {
    if (sys.businessCriticality === 'critical') counts.critical++
    else if (sys.businessCriticality === 'high') counts.high++
    else if (sys.businessCriticality === 'medium') counts.medium++
    else if (sys.businessCriticality === 'low') counts.low++
  })
  return counts
})

useHead({ title: 'Systems - Polaris' })
</script>
