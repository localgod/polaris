<template>
  <UModal
    :open="open"
    :title="componentTitle"
    :description="modalDescription"
    :ui="{ content: 'max-w-5xl', footer: 'justify-end' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <UTable
        v-if="groupedComponent"
        :data="groupedComponent.versionDetails"
        :columns="columns"
        :get-row-id="versionKey"
      >
        <template #version-cell="{ row }">
          <NuxtLink :to="componentDetailTarget(row.original)" class="font-medium hover:underline">
            <code>{{ row.original.version }}</code>
          </NuxtLink>
        </template>
        <template #packageManager-cell="{ row }">
          <span v-if="row.original.packageManager" class="inline-flex items-center gap-1">
            <UIcon :name="pmIcon(row.original.packageManager)" :style="{ color: pmColor(row.original.packageManager) }" class="size-4 flex-shrink-0" />
            {{ row.original.packageManager }}
          </span>
          <span v-else class="text-muted">-</span>
        </template>
        <template #licenses-cell="{ row }">
          <div v-if="row.original.licenses.length" class="flex flex-wrap gap-1">
            <UBadge
              v-for="license in row.original.licenses.slice(0, 2)"
              :key="license.id || license.name"
              color="neutral"
              variant="subtle"
            >
              {{ license.id || license.name || 'Unknown' }}
            </UBadge>
            <span v-if="row.original.licenses.length > 2" class="text-sm text-muted">
              +{{ row.original.licenses.length - 2 }}
            </span>
          </div>
          <span v-else class="text-muted">-</span>
        </template>
        <template #type-cell="{ row }">
          <UBadge v-if="row.original.type" color="primary" variant="subtle">
            {{ row.original.type }}
          </UBadge>
          <span v-else class="text-muted">-</span>
        </template>
        <template #systemCount-cell="{ row }">
          {{ row.original.systemCount || 0 }}
        </template>
        <template #actions-cell="{ row }">
          <UDropdownMenu :items="versionActions(row.original)" :content="{ align: 'end' }">
            <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="sm" />
          </UDropdownMenu>
        </template>
      </UTable>
    </template>
    <template #footer="{ close }">
      <UButton label="Close" color="neutral" variant="outline" @click="close" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { GroupedComponent, GroupedComponentVersion } from '~~/types/api'
import { encodeComponentKey } from '~~/utils/component-identity'

const props = defineProps<{
  open: boolean
  groupedComponent: GroupedComponent | null
  systemFilter?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { status } = useAuth()
const { isSuperuser } = useEffectiveRole()

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

const columns: TableColumn<GroupedComponentVersion>[] = [
  { accessorKey: 'version', header: 'Version', meta: { class: { td: 'whitespace-nowrap' } } },
  { accessorKey: 'packageManager', header: 'Package Manager', meta: { class: { td: 'whitespace-nowrap' } } },
  { accessorKey: 'licenses', header: 'License' },
  { accessorKey: 'type', header: 'Type', meta: { class: { td: 'whitespace-nowrap' } } },
  { accessorKey: 'systemCount', header: 'Systems', meta: { class: { th: 'text-right', td: 'text-right tabular-nums' } } },
  { id: 'actions', header: 'Actions', meta: { class: { th: 'text-right', td: 'text-right' } } }
]

const componentTitle = computed(() => {
  if (!props.groupedComponent) return 'Component Versions'
  return props.groupedComponent.group
    ? `${props.groupedComponent.group}/${props.groupedComponent.name}`
    : props.groupedComponent.name
})

const modalDescription = computed(() => {
  const count = props.groupedComponent?.versionDetails.length ?? 0
  return `${count} ${count === 1 ? 'version' : 'versions'}`
})

function pmIcon(pm: string | null | undefined): string {
  return PM_ICONS[(pm ?? 'unknown').toLowerCase()] ?? 'i-lucide-package'
}

function pmColor(pm: string | null | undefined): string {
  return PM_COLORS[(pm ?? 'unknown').toLowerCase()] ?? PM_COLORS.unknown
}

function componentDetailTarget(component: GroupedComponentVersion) {
  const path = `/components/${encodeComponentKey(component)}`
  return props.systemFilter
    ? { path, query: { fromSystem: props.systemFilter } }
    : path
}

function versionKey(component: GroupedComponentVersion) {
  return component.purl ?? `${component.packageManager ?? 'unknown'}:${component.group ?? ''}:${component.name}@${component.version}`
}

function versionActions(component: GroupedComponentVersion) {
  const group: { label: string, icon: string, onSelect: () => void }[] = [{
    label: 'View Details',
    icon: 'i-lucide-eye',
    onSelect: () => navigateTo(componentDetailTarget(component))
  }]

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

  const groups = [group]

  if (!component.technologyName && status.value === 'authenticated' && isSuperuser.value) {
    groups.push([{
      label: 'Create Technology',
      icon: 'i-lucide-plus',
      onSelect: () => navigateTo({
        path: '/admin/component-links',
        query: {
          component: component.name,
          group: component.group ?? undefined,
          packageManager: component.packageManager ?? undefined
        }
      })
    }])
  }

  return groups
}
</script>
