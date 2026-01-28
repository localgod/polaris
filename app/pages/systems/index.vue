<template>
  <NuxtLayout name="default">
    <div class="space-y">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1>Systems</h1>
          <p class="text-muted" style="margin-top: 0.5rem;">Deployable applications and services</p>
        </div>
        <NuxtLink to="/systems/new" class="btn btn-primary">
          + Create System
        </NuxtLink>
      </div>

      <!-- Error State -->
      <UiCard v-if="error">
        <div class="flex items-center" style="gap: 1rem; color: var(--color-error);">
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3>Error Loading Systems</h3>
            <p class="text-sm">{{ error.message }}</p>
          </div>
        </div>
      </UiCard>

      <template v-else>
        <!-- Summary Stats -->
        <div v-if="data" class="grid grid-cols-4">
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">Total Systems</p>
              <p class="text-3xl font-bold" style="margin-top: 0.5rem;">{{ data.count }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">Critical</p>
              <p class="text-3xl font-bold text-error" style="margin-top: 0.5rem;">{{ criticalityCounts.critical }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">High</p>
              <p class="text-3xl font-bold text-warning" style="margin-top: 0.5rem;">{{ criticalityCounts.high }}</p>
            </div>
          </UiCard>
          <UiCard>
            <div class="text-center">
              <p class="text-sm text-muted">Medium/Low</p>
              <p class="text-3xl font-bold text-success" style="margin-top: 0.5rem;">{{ criticalityCounts.medium + criticalityCounts.low }}</p>
            </div>
          </UiCard>
        </div>

        <!-- Systems Table -->
        <UiCard>
          <UTable
            :data="systems"
            :columns="columns"
            :loading="pending"
            class="flex-1"
          >
            <template #empty>
              <div class="text-center" style="padding: 3rem;">
                <svg style="margin: 0 auto; width: 3rem; height: 3rem; color: var(--color-text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <h3 style="margin-top: 1rem;">No Systems Found</h3>
                <p class="text-muted" style="margin-top: 0.5rem;">
                  The database appears to be empty. Try running: <code>npm run seed</code>
                </p>
              </div>
            </template>
          </UTable>

          <div v-if="total > pageSize" class="flex justify-center border-t border-default pt-4 mt-4">
            <UPagination
              v-model:page="page"
              :total="total"
              :items-per-page="pageSize"
              :sibling-count="1"
              show-edges
            />
          </div>
        </UiCard>
      </template>
    </div>
  </NuxtLayout>
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
  error?: string
}

const UiBadge = resolveComponent('UiBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UButton = resolveComponent('UButton')

function getCriticalityVariant(criticality: string) {
  const variants: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error',
    high: 'warning',
    medium: 'success',
    low: 'neutral'
  }
  return variants[criticality] || 'neutral'
}

const columns: TableColumn<System>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const system = row.original
      return h('div', {}, [
        h('strong', {}, system.name),
        h('p', { class: 'text-sm text-muted' }, system.domain)
      ])
    }
  },
  {
    accessorKey: 'businessCriticality',
    header: 'Criticality',
    cell: ({ row }) => {
      const criticality = row.getValue('businessCriticality') as string
      return h(UiBadge, { variant: getCriticalityVariant(criticality) }, () => criticality)
    }
  },
  {
    accessorKey: 'environment',
    header: 'Environment'
  },
  {
    accessorKey: 'ownerTeam',
    header: 'Owner',
    cell: ({ row }) => {
      const owner = row.getValue('ownerTeam') as string | null
      if (!owner) return h('span', { class: 'text-muted' }, '—')
      return h('span', { class: 'font-medium' }, owner)
    }
  },
  {
    accessorKey: 'componentCount',
    header: 'Components'
  },
  {
    accessorKey: 'repositoryCount',
    header: 'Repositories'
  },
  {
    id: 'actions',
    header: '',
    meta: {
      class: {
        th: 'w-10',
        td: 'text-right'
      }
    },
    cell: ({ row }) => {
      const system = row.original

      const items = [
        [
          {
            label: 'View Details',
            icon: 'i-lucide-eye',
            onSelect: () => navigateTo(`/systems/${encodeURIComponent(system.name)}`)
          },
          {
            label: 'Unmapped Components',
            icon: 'i-lucide-package-x',
            onSelect: () => navigateTo(`/systems/${encodeURIComponent(system.name)}/unmapped-components`)
          }
        ]
      ]

      return h(UDropdownMenu, {
        items,
        content: { align: 'end' }
      }, {
        default: () => h(UButton, {
          icon: 'i-lucide-ellipsis-vertical',
          color: 'neutral',
          variant: 'ghost',
          size: 'sm'
        })
      })
    }
  }
]

const page = ref(1)
const pageSize = 20

const queryParams = computed(() => ({
  limit: pageSize,
  offset: (page.value - 1) * pageSize
}))

const { data, pending, error } = await useFetch<SystemsResponse>('/api/systems', {
  query: queryParams
})

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

useHead({
  title: 'Systems - Polaris'
})
</script>
