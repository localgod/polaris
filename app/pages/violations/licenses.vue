<template>
  <div class="space-y-6">
    <UPageHeader
      title="License Violations"
      description="Components using disallowed licenses"
      :links="[{ label: 'Back to Violations', to: '/violations', icon: 'i-lucide-arrow-left', variant: 'outline' as const }]"
    />

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Error"
      :description="error.message"
    />

    <template v-else>
      <UCard>
        <UTable
          :data="violations"
          :columns="columns"
          :loading="pending"
          class="flex-1"
        >
          <template #empty>
            <div class="text-center py-8">
              <UIcon name="i-lucide-check-circle" class="text-5xl text-(--ui-color-success-500)" />
              <h3 class="mt-4">No License Violations!</h3>
              <p class="text-(--ui-text-muted) mt-2">All components use allowed licenses.</p>
            </div>
          </template>
        </UTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

interface LicenseViolation {
  teamName: string
  systemName: string
  componentName: string
  componentVersion: string
  componentPurl: string
  licenseId: string
  licenseName: string
  licenseCategory: string
}

interface LicenseViolationsResponse {
  success: boolean
  data: LicenseViolation[]
  count: number
}

function getCategoryColor(category: string): 'success' | 'warning' | 'error' | 'neutral' {
  const colors: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    permissive: 'success',
    'weak-copyleft': 'warning',
    copyleft: 'warning',
    'strong-copyleft': 'error',
    proprietary: 'error',
    'public-domain': 'success'
  }
  return colors[category?.toLowerCase()] || 'neutral'
}

const columns: TableColumn<LicenseViolation>[] = [
  {
    accessorKey: 'componentName',
    header: 'Component',
    cell: ({ row }) => {
      return h('div', {}, [
        h('strong', {}, row.original.componentName),
        h('br'),
        h('code', { class: 'text-sm' }, row.original.componentVersion)
      ])
    }
  },
  {
    accessorKey: 'licenseId',
    header: 'License',
    cell: ({ row }) => {
      const v = row.original
      return h(resolveComponent('NuxtLink'), {
        to: `/licenses/${encodeURIComponent(v.licenseId)}`,
        class: 'hover:underline'
      }, () => h(resolveComponent('UBadge'), {
        color: getCategoryColor(v.licenseCategory),
        variant: 'subtle'
      }, () => v.licenseId))
    }
  },
  {
    accessorKey: 'systemName',
    header: 'System',
    cell: ({ row }) => {
      return h(resolveComponent('NuxtLink'), {
        to: `/systems/${encodeURIComponent(row.original.systemName)}`,
        class: 'hover:underline'
      }, () => row.original.systemName)
    }
  },
  {
    accessorKey: 'teamName',
    header: 'Team',
    cell: ({ row }) => {
      return h(resolveComponent('NuxtLink'), {
        to: `/teams/${encodeURIComponent(row.original.teamName)}`,
        class: 'hover:underline'
      }, () => row.original.teamName)
    }
  }
]

const { data, pending, error } = await useFetch<LicenseViolationsResponse>('/api/licenses/violations')

const violations = computed(() => data.value?.data || [])

useHead({ title: 'License Violations - Polaris' })
</script>
