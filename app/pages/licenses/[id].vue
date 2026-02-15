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
          :links="[{ label: 'Back to Licenses', to: '/licenses', icon: 'i-lucide-arrow-left', variant: 'outline' as const }]"
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
          <UBadge v-if="license.whitelisted" color="success" variant="subtle">
            Enabled
          </UBadge>
          <UBadge v-else color="neutral" variant="subtle">
            Disabled
          </UBadge>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Components</p>
            <p class="text-2xl font-bold mt-1">{{ license.componentCount || 0 }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Category</p>
            <p class="text-2xl font-bold mt-1">{{ license.category || '—' }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">OSI Approved</p>
            <p class="text-2xl font-bold mt-1">{{ license.osiApproved ? 'Yes' : 'No' }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">SPDX URL</p>
            <p class="text-sm font-medium mt-1 truncate">
              <a
                v-if="license.url"
                :href="license.url"
                target="_blank"
                rel="noopener noreferrer"
                class="hover:underline"
              >
                View on SPDX
              </a>
              <span v-else class="text-(--ui-text-muted)">—</span>
            </p>
          </div>
        </UCard>
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
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Components Using This License</h3>
        </template>

        <UTable
          :data="components"
          :columns="componentColumns"
          :loading="componentsPending"
          class="flex-1"
        >
          <template #empty>
            <div class="text-center text-(--ui-text-muted) py-12">
              No components found using this license.
            </div>
          </template>
        </UTable>

        <div v-if="componentsTotal > componentPageSize" class="flex justify-center border-t border-(--ui-border) pt-4 mt-4">
          <UPagination
            v-model:page="componentPage"
            :total="componentsTotal"
            :items-per-page="componentPageSize"
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
  whitelisted: boolean
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

interface ComponentsResponse {
  success: boolean
  data: LicenseComponent[]
  count: number
  total: number
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

const showLicenseText = ref(true)

// License detail
const { data, pending, error } = await useFetch<LicenseResponse>(
  () => `/api/licenses/${encodeURIComponent(route.params.id as string)}`
)

const license = computed(() => data.value?.data?.[0] || null)

// Components pagination
const componentPage = ref(1)
const componentPageSize = 20

const componentQueryParams = computed(() => ({
  limit: componentPageSize,
  offset: (componentPage.value - 1) * componentPageSize
}))

const { data: componentsData, pending: componentsPending } = await useFetch<ComponentsResponse>(
  () => `/api/licenses/${encodeURIComponent(route.params.id as string)}/components`,
  { query: componentQueryParams }
)

const components = computed(() => componentsData.value?.data || [])
const componentsTotal = computed(() => componentsData.value?.total || 0)

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
