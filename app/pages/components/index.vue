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
        <div class="flex items-center gap-2 pb-4 border-b border-(--ui-border) mb-4">
          <UInput
            v-model="searchInput"
            placeholder="Filter by name..."
            icon="i-lucide-search"
            class="max-w-sm"
          />
        </div>

        <UTable
          v-model:sorting="sorting"
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
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Column } from '@tanstack/vue-table'
import type { ApiResponse, Component } from '~~/types/api'

const { status } = useAuth()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

function getSortableHeader(column: Column<Component>, label: string) {
  const isSorted = column.getIsSorted()

  return h(UDropdownMenu, {
    content: { align: 'start' as const },
    items: [
      {
        label: 'Asc',
        type: 'checkbox' as const,
        icon: 'i-lucide-arrow-up-narrow-wide',
        checked: isSorted === 'asc',
        onSelect: () => {
          if (isSorted === 'asc') {
            column.clearSorting()
          } else {
            column.toggleSorting(false)
          }
        }
      },
      {
        label: 'Desc',
        type: 'checkbox' as const,
        icon: 'i-lucide-arrow-down-wide-narrow',
        checked: isSorted === 'desc',
        onSelect: () => {
          if (isSorted === 'desc') {
            column.clearSorting()
          } else {
            column.toggleSorting(true)
          }
        }
      }
    ]
  }, () => h(UButton, {
    color: 'neutral',
    variant: 'ghost',
    label,
    icon: isSorted
      ? isSorted === 'asc'
        ? 'i-lucide-arrow-up-narrow-wide'
        : 'i-lucide-arrow-down-wide-narrow'
      : 'i-lucide-arrow-up-down',
    class: '-mx-2.5 data-[state=open]:bg-elevated'
  }))
}

const columns: TableColumn<Component>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => getSortableHeader(column, 'Name'),
    cell: ({ row }) => {
      const group = row.original.group
      const name = row.getValue('name') as string
      const displayName = group ? `${group}/${name}` : name
      return h('strong', {}, displayName)
    }
  },
  {
    accessorKey: 'version',
    header: ({ column }) => getSortableHeader(column, 'Version'),
    cell: ({ row }) => h('code', {}, row.getValue('version') as string)
  },
  {
    accessorKey: 'packageManager',
    header: ({ column }) => getSortableHeader(column, 'Package Manager')
  },
  {
    accessorKey: 'licenses',
    header: 'License',
    enableSorting: false,
    cell: ({ row }) => {
      const licenses = row.original.licenses
      if (!licenses || licenses.length === 0) {
        return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      }

      const badges = licenses.slice(0, 2).map(lic =>
        h(UBadge, { color: 'neutral', variant: 'subtle', class: 'mr-1', key: lic.id || lic.name },
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
    header: ({ column }) => getSortableHeader(column, 'Type'),
    cell: ({ row }) => {
      const type = row.getValue('type') as string | undefined
      if (!type) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h(UBadge, { color: 'primary', variant: 'subtle' }, () => type)
    }
  },
  {
    accessorKey: 'systemCount',
    header: ({ column }) => getSortableHeader(column, 'Systems'),
    cell: ({ row }) => row.original.systemCount || 0
  },
  {
    id: 'actions',
    header: '',
    meta: { class: { th: 'w-10', td: 'text-right' } },
    cell: ({ row }) => {
      const component = row.original
      const items: { label: string, icon: string, onSelect: () => void }[][] = []
      const group: { label: string, icon: string, onSelect: () => void }[] = []

      if (component.purl) {
        group.push({
          label: 'Copy PURL',
          icon: 'i-lucide-copy',
          onSelect: () => navigator.clipboard.writeText(component.purl!)
        })
      }

      if (component.homepage) {
        group.push({
          label: 'Visit Homepage',
          icon: 'i-lucide-external-link',
          onSelect: () => window.open(component.homepage!, '_blank')
        })
      }

      if (component.technologyName) {
        group.push({
          label: 'View Technology',
          icon: 'i-lucide-cpu',
          onSelect: () => navigateTo(`/technologies/${encodeURIComponent(component.technologyName!)}`)
        })
      }

      if (group.length > 0) {
        items.push(group)
      }

      if (!component.technologyName && status.value === 'authenticated') {
        const query: Record<string, string> = {
          name: component.name,
          componentName: component.name
        }
        if (component.group) query.componentGroup = component.group
        if (component.packageManager) query.componentPackageManager = component.packageManager
        if (component.type) query.componentType = component.type
        items.push([{
          label: 'Create Technology',
          icon: 'i-lucide-plus',
          onSelect: () => navigateTo({ path: '/technologies/new', query })
        }])
      }

      if (items.length === 0) return null

      return h(UDropdownMenu, { items, content: { align: 'end' as const } }, {
        default: () => h(UButton, { icon: 'i-lucide-ellipsis-vertical', color: 'neutral', variant: 'ghost', size: 'sm' })
      })
    }
  }
]

const sorting = ref([])

const route = useRoute()
const licenseFilter = computed(() => route.query.license as string | undefined)

const page = ref(1)
const pageSize = 20

const searchInput = ref('')
const debouncedSearch = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchInput, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedSearch.value = value
    page.value = 1
  }, 300)
})

const queryParams = computed(() => {
  const params: Record<string, string | number> = {
    limit: pageSize,
    offset: (page.value - 1) * pageSize
  }
  if (debouncedSearch.value) {
    params.search = debouncedSearch.value
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
