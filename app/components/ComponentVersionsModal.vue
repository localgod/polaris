<template>
  <UModal
    :open="open"
    :title="componentTitle"
    :description="modalDescription"
    :ui="{ content: 'max-w-5xl', footer: 'justify-end' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div v-if="groupedComponent" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-(--ui-border)">
          <thead>
            <tr class="text-left text-xs font-medium text-(--ui-text-muted) uppercase tracking-normal">
              <th class="px-3 py-2">Version</th>
              <th class="px-3 py-2">Package Manager</th>
              <th class="px-3 py-2">License</th>
              <th class="px-3 py-2">Type</th>
              <th class="px-3 py-2 text-right">Systems</th>
              <th class="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-(--ui-border)">
            <tr v-for="version in groupedComponent.versionDetails" :key="versionKey(version)">
              <td class="px-3 py-2 whitespace-nowrap">
                <NuxtLink :to="componentDetailTarget(version)" class="font-medium hover:underline">
                  <code>{{ version.version }}</code>
                </NuxtLink>
              </td>
              <td class="px-3 py-2 whitespace-nowrap">
                <span v-if="version.packageManager" class="inline-flex items-center gap-1">
                  <UIcon :name="pmIcon(version.packageManager)" :style="{ color: pmColor(version.packageManager) }" class="size-4 flex-shrink-0" />
                  {{ version.packageManager }}
                </span>
                <span v-else class="text-(--ui-text-muted)">-</span>
              </td>
              <td class="px-3 py-2">
                <div v-if="version.licenses.length" class="flex flex-wrap gap-1">
                  <UBadge
                    v-for="license in version.licenses.slice(0, 2)"
                    :key="license.id || license.name"
                    color="neutral"
                    variant="subtle"
                  >
                    {{ license.id || license.name || 'Unknown' }}
                  </UBadge>
                  <span v-if="version.licenses.length > 2" class="text-sm text-(--ui-text-muted)">
                    +{{ version.licenses.length - 2 }}
                  </span>
                </div>
                <span v-else class="text-(--ui-text-muted)">-</span>
              </td>
              <td class="px-3 py-2 whitespace-nowrap">
                <UBadge v-if="version.type" color="primary" variant="subtle">
                  {{ version.type }}
                </UBadge>
                <span v-else class="text-(--ui-text-muted)">-</span>
              </td>
              <td class="px-3 py-2 text-right tabular-nums">
                {{ version.systemCount || 0 }}
              </td>
              <td class="px-3 py-2 text-right">
                <UDropdownMenu :items="versionActions(version)" :content="{ align: 'end' }">
                  <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="sm" />
                </UDropdownMenu>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
    <template #footer>
      <UButton label="Close" color="neutral" variant="outline" @click="emit('update:open', false)" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
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
      onSelect: () => navigateTo({ path: '/admin/component-links', query: { component: component.name } })
    }])
  }

  return groups
}
</script>
