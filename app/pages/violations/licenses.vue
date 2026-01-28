<template>
  
    <div class="space-y">
      <div class="page-header">
        <NuxtLink to="/violations" style="display: inline-block; margin-bottom: 0.5rem;">← Back to Violations</NuxtLink>
        <h1>License Violations</h1>
        <p>Components using non-compliant licenses</p>
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
            :data="violations"
            :columns="columns"
            :loading="pending"
            class="flex-1"
          >
            <template #empty>
              <div class="text-center" style="padding: 2rem;">
                <svg style="margin: 0 auto; width: 3rem; height: 3rem; color: var(--color-success);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 style="margin-top: 1rem;">No License Violations!</h3>
                <p class="text-muted" style="margin-top: 0.5rem;">All components use compliant licenses.</p>
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

interface LicenseViolation {
  team: string
  system: string
  component: {
    name: string
    version: string
    purl: string
  }
  license: {
    id: string
    name: string
    category: string
    osiApproved: boolean
  }
  policy: {
    name: string
    description: string
    severity: string
    ruleType: string
    enforcedBy: string
  }
}

interface LicenseViolationsResponse {
  success: boolean
  data: LicenseViolation[]
  count: number
  total?: number
}

const UiBadge = resolveComponent('UiBadge')

function getCategoryVariant(category: string) {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    permissive: 'success',
    copyleft: 'warning',
    proprietary: 'error'
  }
  return variants[category] || 'neutral'
}

function getSeverityVariant(severity: string) {
  const variants: Record<string, 'error' | 'warning' | 'success' | 'neutral'> = {
    critical: 'error',
    error: 'error',
    warning: 'warning',
    info: 'neutral'
  }
  return variants[severity] || 'neutral'
}

const columns: TableColumn<LicenseViolation>[] = [
  {
    accessorKey: 'component',
    header: 'Component',
    cell: ({ row }) => {
      const component = row.original.component
      return h('div', {}, [
        h('strong', {}, component.name),
        h('br'),
        h('code', { class: 'text-sm' }, component.version)
      ])
    }
  },
  {
    accessorKey: 'license',
    header: 'License',
    cell: ({ row }) => {
      const license = row.original.license
      return h(UiBadge, { variant: getCategoryVariant(license.category) }, () => license.id || license.name)
    }
  },
  {
    accessorKey: 'system',
    header: 'System'
  },
  {
    accessorKey: 'team',
    header: 'Team'
  },
  {
    accessorKey: 'policy',
    header: 'Severity',
    cell: ({ row }) => {
      const severity = row.original.policy.severity
      return h(UiBadge, { variant: getSeverityVariant(severity) }, () => severity)
    }
  }
]

const page = ref(1)
const pageSize = 20

const queryParams = computed(() => ({
  limit: pageSize,
  offset: (page.value - 1) * pageSize
}))

const { data, pending, error } = await useFetch<LicenseViolationsResponse>('/api/policies/license-violations', {
  query: queryParams
})

const violations = computed(() => data.value?.data || [])
const total = computed(() => data.value?.total || data.value?.count || 0)

useHead({ title: 'License Violations - Polaris' })
</script>
