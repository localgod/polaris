<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <UPageHeader
        title="Components"
      >
        <template #description>
          <template v-if="systemFilter">
            {{ showDirectOnly ? 'Direct' : 'All' }} components in system: <strong>{{ systemFilter }}</strong>
            <NuxtLink to="/components" class="ml-2">(clear filter)</NuxtLink>
          </template>
          <template v-else-if="lifecycleRiskFilter">
            Components with lifecycle risk
            <NuxtLink to="/components" class="ml-2">(clear filter)</NuxtLink>
          </template>
          <template v-else-if="licenseFilter">
            Components with license: <strong>{{ licenseFilter }}</strong>
            <NuxtLink to="/components" class="ml-2">(clear filter)</NuxtLink>
          </template>
          <template v-else>
            Direct SBOM entries across all systems
          </template>
        </template>
      </UPageHeader>
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
      <PaginatedTable
        v-model:sorting="sorting"
        v-model:page="page"
        :data="components"
        :columns="columns"
        :loading="pending"
        :manual-sorting="true"
        :on-select="openGroupedComponent"
        :total="total"
        :page-size="pageSize"
      >
        <template #header>
          <TableSearchHeader v-model="searchInput">
            <template #filters>
              <USwitch
                v-if="systemFilter"
                v-model="showDirectOnly"
                label="Direct only"
                size="sm"
              />
              <USwitch
                v-model="showDevDependencies"
                label="Show dev dependencies"
                size="sm"
              />
            </template>
          </TableSearchHeader>
        </template>
        <template #empty>
          <div class="text-center text-(--ui-text-muted) py-12">
            No components found.
          </div>
        </template>
      </PaginatedTable>

      <ComponentVersionsModal
        v-model:open="versionsModalOpen"
        :grouped-component="selectedComponent"
        :system-filter="systemFilter"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { h, resolveComponent, defineComponent, ref } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiResponse, GroupedComponent } from '~~/types/api'

const PM_COLORS: Record<string, string> = {
  npm: '#cb3837', yarn: '#2c8ebb', maven: '#c71a36', gradle: '#02303a',
  pypi: '#3572a5', cargo: '#dea584', nuget: '#004880', gem: '#cc342d',
  go: '#00add8', composer: '#885630', unknown: '#6b7280',
}

const PM_ICONS: Record<string, string> = {
  npm:      'i-simple-icons-npm',
  yarn:     'i-simple-icons-yarn',
  maven:    'i-simple-icons-apachemaven',
  gradle:   'i-simple-icons-gradle',
  pypi:     'i-simple-icons-pypi',
  cargo:    'i-simple-icons-rust',
  nuget:    'i-simple-icons-nuget',
  gem:      'i-simple-icons-rubygems',
  go:       'i-simple-icons-go',
  composer: 'i-simple-icons-composer',
}

function pmIcon(pm: string | null | undefined): string {
  return PM_ICONS[(pm ?? 'unknown').toLowerCase()] ?? 'i-lucide-package'
}

function pmColor(pm: string | null | undefined): string {
  return PM_COLORS[(pm ?? 'unknown').toLowerCase()] ?? PM_COLORS.unknown
}

const { getSortableHeader } = useSortableTable()

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UTooltip = resolveComponent('UTooltip')

// Inline component so each row gets its own reactive description state.
const ComponentNameCell = defineComponent({
  props: {
    component: { type: Object as () => GroupedComponent, required: true }
  },
  setup(props) {
    const { state, fetch } = useComponentDescription(props.component)

    function tooltipContent() {
      if (state.value.pending) return 'Loading…'
      if (state.value.description) return state.value.description
      if (state.value.fetched) return 'No description available'
      return 'Hover to load description'
    }

    return () => {
      // Read from props inside the render function so the display name
      // updates when the row is reused with a different component.
      const displayName = props.component.group
        ? `${props.component.group}/${props.component.name}`
        : props.component.name

      return h(
        UTooltip,
        {
          onMouseenter: fetch,
          ui: { content: 'max-w-xs h-auto whitespace-normal bg-inverted text-inverted rounded px-3 py-2 text-xs shadow-md' }
        },
        {
          default: () => h('button', {
            type: 'button',
            class: 'font-semibold hover:underline text-left',
            onClick: () => openGroupedComponent(null, { original: props.component })
          }, displayName),
          content: () => tooltipContent()
        }
      )
    }
  }
})

const columns: TableColumn<GroupedComponent>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => getSortableHeader(column, 'Name'),
    cell: ({ row }) => h(ComponentNameCell, { component: row.original })
  },
  {
    accessorKey: 'versionRange',
    header: 'Versions',
    enableSorting: false,
    cell: ({ row }) => {
      const versionCount = row.original.versions.length
      return h('div', { class: 'flex items-center gap-2' }, [
        h('code', {}, row.original.versionRange ?? '-'),
        versionCount > 1
          ? h(UBadge, { color: 'neutral', variant: 'subtle' }, () => `${versionCount}`)
          : null
      ])
    }
  },
  {
    accessorKey: 'packageManager',
    header: ({ column }) => getSortableHeader(column, 'Package Manager'),
    cell: ({ row }) => {
      const pm = row.getValue('packageManager') as string | null
      if (!pm) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      return h('span', { class: 'flex items-center gap-1' }, [
        h(resolveComponent('UIcon'), { name: pmIcon(pm), style: { color: pmColor(pm) }, class: 'size-4 flex-shrink-0' }),
        pm,
      ])
    },
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
    accessorKey: 'primaryType',
    header: ({ column }) => getSortableHeader(column, 'Type'),
    cell: ({ row }) => {
      const type = row.original.primaryType
      if (!type) return h('span', { class: 'text-(--ui-text-muted)' }, '—')
      const extraCount = Math.max(0, row.original.types.length - 1)
      return h('div', { class: 'flex items-center gap-1' }, [
        h(UBadge, { color: 'primary', variant: 'subtle' }, () => type),
        extraCount > 0
          ? h('span', { class: 'text-(--ui-text-muted) text-sm' }, `+${extraCount}`)
          : null
      ])
    }
  },
  {
    accessorKey: 'systemCount',
    header: ({ column }) => getSortableHeader(column, 'Systems'),
    cell: ({ row }) => row.original.systemCount || 0
  },
  {
    id: 'open',
    header: '',
    meta: { class: { th: 'w-10', td: 'text-right' } },
    cell: ({ row }) => h(UButton, {
      icon: 'i-lucide-list',
      color: 'neutral',
      variant: 'ghost',
      size: 'sm',
      'aria-label': 'View versions',
      onClick: () => openGroupedComponent(null, row)
    })
  }
]

const route = useRoute()
const licenseFilter = computed(() => route.query.license as string | undefined)
const systemFilter = computed(() => route.query.system as string | undefined)
const lifecycleRiskFilter = computed(() => route.query.lifecycleRisk === 'true')
const showDevDependenciesCookie = useCookie<'true' | 'false'>('polaris-components-show-dev-dependencies', {
  default: () => 'true',
  sameSite: 'lax'
})
const showDevDependencies = computed({
  get: () => showDevDependenciesCookie.value !== 'false',
  set: value => { showDevDependenciesCookie.value = value ? 'true' : 'false' }
})

const showDirectOnlyCookie = useCookie<'true' | 'false'>('polaris-components-show-direct-only', {
  default: () => 'true',
  sameSite: 'lax'
})
const showDirectOnly = computed({
  get: () => showDirectOnlyCookie.value === 'true',
  set: value => { showDirectOnlyCookie.value = value ? 'true' : 'false' }
})

const selectedComponent = ref<GroupedComponent | null>(null)
const versionsModalOpen = ref(false)

function openGroupedComponent(_event: Event | null, row: { original: GroupedComponent }) {
  selectedComponent.value = row.original
  versionsModalOpen.value = true
}

// Initialize search first, before using in resetOn
const { searchInput, debouncedSearch } = useTableSearch()

// Now we can safely reference debouncedSearch in resetOn
const resetOnDeps = [debouncedSearch, licenseFilter, systemFilter, lifecycleRiskFilter, showDevDependencies, showDirectOnly]
const { sorting, page, pageSize, offset, sortBy, sortOrder } = usePaginatedSorting({
  resetOn: resetOnDeps
})

const includeDev = computed(() => showDevDependencies.value ? undefined : 'false')
// Global list (no system): always direct-only to keep result count manageable.
// System list: respect the user toggle; default is to show all components.
const direct = computed(() => (!systemFilter.value || showDirectOnly.value) ? 'true' : undefined)

// Pass individual refs/computeds as query values so Nuxt tracks each one
// as a reactive dependency for the fetch key — passing a computed object
// does not work because reactive() unwraps it at setup time.
const { data, pending, error } = await useFetch<ApiResponse<GroupedComponent>>('/api/components/grouped', {
  query: {
    limit: pageSize,
    offset,
    search: debouncedSearch,
    license: licenseFilter,
    system: systemFilter,
    lifecycleRisk: computed(() => lifecycleRiskFilter.value ? 'true' : undefined),
    direct,
    includeDev,
    sortBy,
    sortOrder,
  },
})

const components = useApiData(data)
const total = useApiCount(data)

useHead({ title: 'Components - Polaris' })
</script>
