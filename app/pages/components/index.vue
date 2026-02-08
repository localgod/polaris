<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <UPageHeader
        title="Components"
      >
        <template #description>
          <template v-if="licenseFilter">
            Components with license: <strong>{{ licenseFilter }}</strong>
            <NuxtLink to="/components" class="ml-2">(clear filter)</NuxtLink>
          </template>
          <template v-else>
            SBOM entries across all systems
          </template>
        </template>
      </UPageHeader>
      <UButton
        label="View Unmapped"
        to="/components/unmapped"
        variant="outline"
      />
    </div>

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
          :data="components"
          :columns="columns"
          :loading="pending"
          class="flex-1"
        >
          <template #empty>
            <div class="text-center text-(--ui-text-muted) py-12">
              No components found.
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
import type { ApiResponse, Component } from '~~/types/api'

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
        return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      }

      const badges = licenses.slice(0, 2).map(lic =>
        h(resolveComponent('UBadge'), { color: 'neutral', variant: 'subtle', class: 'mr-1', key: lic.id || lic.name },
          () => lic.id || lic.name || 'Unknown')
      )

      if (licenses.length > 2) {
        badges.push(h('span', { class: 'text-(--ui-text-muted) text-sm' }, `+${licenses.length - 2}`))
      }

      return h('div', {}, badges)
    }
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.getValue('type') as string | undefined
      if (!type) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(resolveComponent('UBadge'), { color: 'primary', variant: 'subtle' }, () => type)
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
