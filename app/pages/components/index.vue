<template>
  
    <div class="space-y">
      <div class="flex justify-between items-center">
        <div class="page-header">
          <h1>Components</h1>
          <p>
            <template v-if="licenseFilter">
              Components with license: <strong>{{ licenseFilter }}</strong>
              <NuxtLink to="/components" style="margin-left: 0.5rem;">(clear filter)</NuxtLink>
            </template>
            <template v-else>
              SBOM entries across all systems
            </template>
          </p>
        </div>
        <NuxtLink to="/components/unmapped" class="btn btn-secondary">View Unmapped</NuxtLink>
      </div>

      <UiCard v-if="error">
        <div class="flex items-center" style="gap: 1rem; color: var(--color-error);">
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3>Error</h3>
            <p class="text-sm">{{ error.message }}</p>
          </div>
        </div>
      </UiCard>

      <template v-else>
        <UiCard>
          <UTable
            :data="components"
            :columns="columns"
            :loading="pending"
            class="flex-1"
          >
            <template #empty>
              <div class="text-center text-muted" style="padding: 3rem;">
                No components found.
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
  
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse, Component } from '~~/types/api'

const UiBadge = resolveComponent('UiBadge')

const columns: TableColumn<Component>[] = [
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
    header: 'Package Manager'
  },
  {
    accessorKey: 'licenses',
    header: 'License',
    cell: ({ row }) => {
      const licenses = row.original.licenses
      if (!licenses || licenses.length === 0) {
        return h('span', { class: 'text-muted' }, '—')
      }

      const badges = licenses.slice(0, 2).map(lic =>
        h(UiBadge, { variant: 'neutral', style: 'margin-right: 0.25rem;', key: lic.id || lic.name },
          () => lic.id || lic.name || 'Unknown')
      )

      if (licenses.length > 2) {
        badges.push(h('span', { class: 'text-muted text-sm' }, `+${licenses.length - 2}`))
      }

      return h('div', {}, badges)
    }
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.getValue('type') as string | undefined
      if (!type) {
        return h('span', { class: 'text-muted' }, '—')
      }
      return h(UiBadge, { variant: 'primary' }, () => type)
    }
  },
  {
    accessorKey: 'systemCount',
    header: 'Systems',
    cell: ({ row }) => row.original.systemCount || 0
  }
]

const route = useRoute()
const licenseFilter = computed(() => route.query.license as string | undefined)

const page = ref(1)
const pageSize = 20

const queryParams = computed(() => {
  const params: Record<string, string | number> = {
    limit: pageSize,
    offset: (page.value - 1) * pageSize
  }
  if (licenseFilter.value) {
    params.license = licenseFilter.value
  }
  return params
})

const { data, pending, error } = await useFetch<ApiResponse<Component>>('/api/components', {
  query: queryParams
})

const components = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

useHead({ title: 'Components - Polaris' })
</script>
