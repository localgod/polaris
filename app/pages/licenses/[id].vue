<template>
  <div class="space-y-6">
    <USkeleton v-if="pending" class="h-96 w-full" />

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Error Loading License"
      :description="error.message"
    >
      <template #actions>
        <UButton label="Back to Licenses" to="/licenses" variant="outline" />
      </template>
    </UAlert>

    <template v-else-if="license">
      <div class="flex justify-between items-start">
        <UPageHeader
          :title="license.name || license.id"
          :description="license.name ? license.id : undefined"
          :links="headerLinks"
        />
        <div class="flex gap-2 flex-shrink-0">
          <UBadge v-if="license.category" :color="getCategoryColor(license.category)" variant="subtle">
            {{ license.category }}
          </UBadge>
          <UBadge v-if="license.osiApproved" color="success" variant="subtle">
            OSI Approved
          </UBadge>
          <UBadge v-if="license.deprecated" color="warning" variant="subtle">
            Deprecated
          </UBadge>
          <UBadge v-if="license.allowed" color="success" variant="subtle">
            Allowed
          </UBadge>
          <UBadge v-else color="error" variant="subtle">
            Disallowed
          </UBadge>
        </div>
      </div>

      <!-- License Text -->
      <UCard v-if="license.licenseText">
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold">License Text</h3>
            <UButton
              :icon="showLicenseText ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="showLicenseText = !showLicenseText"
            >
              {{ showLicenseText ? 'Collapse' : 'Expand' }}
            </UButton>
          </div>
        </template>
        <pre v-if="showLicenseText" class="whitespace-pre-wrap text-sm font-mono leading-relaxed max-h-[600px] overflow-y-auto">{{ license.licenseText }}</pre>
      </UCard>

      <!-- Components Table -->
      <PaginatedTable
        v-model:page="componentPage"
        :data="components"
        :columns="componentColumns"
        :loading="componentsPending"
        :total="componentsTotal"
        :page-size="componentPageSize"
      >
        <template #header>
          <h3 class="text-lg font-semibold">Components Using This License ({{ license.componentCount || 0 }})</h3>
        </template>
        <template #empty>
          <div class="text-center text-(--ui-text-muted) py-12">
            No components found using this license.
          </div>
        </template>
      </PaginatedTable>
    </template>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse } from '~~/types/api'

const route = useRoute()

interface LicenseDetail {
  id: string
  name: string
  spdxId: string
  osiApproved: boolean
  url: string | null
  category: string | null
  licenseText: string | null
  text: string | null
  deprecated: boolean
  allowed: boolean
  componentCount: number
}

interface LicenseComponent {
  name: string
  version: string
  packageManager: string
  type: string | null
  purl: string | null
  systemCount: number
  technologyName: string | null
}

interface LicenseResponse {
  success: boolean
  data: LicenseDetail[]
}

const showLicenseText = ref(true)

// License detail
const { data, pending, error } = await useFetch<LicenseResponse>(
  () => `/api/licenses/${encodeURIComponent(route.params.id as string)}`
)

const license = computed(() => data.value?.data?.[0] || null)

const headerLinks = computed(() => {
  const links: { label: string; to: string; icon: string; variant: 'outline'; target?: '_blank' }[] = [
    { label: 'Back to Licenses', to: '/licenses', icon: 'i-lucide-arrow-left', variant: 'outline' }
  ]
  if (license.value?.url) {
    links.push({ label: 'View on SPDX', to: license.value.url, icon: 'i-lucide-external-link', variant: 'outline', target: '_blank' })
  }
  return links
})

// Components pagination
const { page: componentPage, pageSize: componentPageSize, offset: componentOffset } = usePaginatedSorting()

const { data: componentsData, pending: componentsPending } = await useFetch<ApiResponse<LicenseComponent>>(
  () => `/api/licenses/${encodeURIComponent(route.params.id as string)}/components`,
  { query: { limit: componentPageSize, offset: componentOffset } }
)

const components = useApiData(componentsData)
const componentsTotal = useApiCount(componentsData)

const componentColumns: TableColumn<LicenseComponent>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => {
      const comp = row.original
      return h('span', { class: 'font-medium' }, `${comp.name}`)
    }
  },
  {
    accessorKey: 'version',
    header: 'Version'
  },
  {
    accessorKey: 'packageManager',
    header: 'Package Manager',
    cell: ({ row }) => {
      const pm = row.getValue('packageManager') as string
      if (!pm) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(resolveComponent('UBadge'), { color: 'neutral', variant: 'subtle' }, () => pm)
    }
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.getValue('type') as string
      return type || '—'
    }
  },
  {
    accessorKey: 'technologyName',
    header: 'Technology',
    cell: ({ row }) => {
      const tech = row.getValue('technologyName') as string
      if (!tech) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(resolveComponent('NuxtLink'), {
        to: `/technologies/${encodeURIComponent(tech)}`,
        class: 'hover:underline'
      }, () => tech)
    }
  },
  {
    accessorKey: 'systemCount',
    header: 'Systems',
    cell: ({ row }) => String(row.getValue('systemCount') ?? 0)
  }
]
</script>
