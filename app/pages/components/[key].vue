<template>
  <div class="space-y-6">
    <USkeleton v-if="pending" class="h-96 w-full" />

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Error Loading Component"
      :description="error.message"
    >
      <template #actions>
        <UButton label="Back to Components" to="/components" variant="outline" />
      </template>
    </UAlert>

    <template v-else-if="component">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <UPageHeader
          :title="displayName"
          :description="component.description || component.purl || undefined"
          :links="[{ label: 'Back to Components', to: '/components', icon: 'i-lucide-arrow-left', variant: 'outline' as const }]"
        />
        <div class="flex flex-wrap gap-2">
          <UBadge v-if="component.packageManager" color="neutral" variant="subtle">
            {{ component.packageManager }}
          </UBadge>
          <UBadge v-if="component.type" color="primary" variant="subtle">
            {{ component.type }}
          </UBadge>
          <UBadge v-if="component.technologyName" color="info" variant="subtle">
            {{ component.technologyName }}
          </UBadge>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Version</p>
            <p class="text-2xl font-bold mt-1 break-all">{{ component.version }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Systems</p>
            <p class="text-2xl font-bold mt-1">{{ component.systemCount }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Licenses</p>
            <p class="text-2xl font-bold mt-1">{{ component.licenses.length }}</p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-(--ui-text-muted)">Lifecycle</p>
            <p class="mt-2">
              <UBadge :color="getEolColor(component.eol?.status)" variant="subtle">
                {{ getEolLabel(component.eol?.status) }}
              </UBadge>
            </p>
          </div>
        </UCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Basic Information</h2>
          </template>
          <div class="space-y-3">
            <div>
              <span class="text-sm text-(--ui-text-muted)">Name</span>
              <p class="font-medium break-all">{{ component.name }}</p>
            </div>
            <div v-if="component.group">
              <span class="text-sm text-(--ui-text-muted)">Group</span>
              <p class="font-medium break-all">{{ component.group }}</p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">Package Manager</span>
              <p class="font-medium">{{ component.packageManager || '—' }}</p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">Type</span>
              <p class="font-medium">{{ component.type || '—' }}</p>
            </div>
            <div>
              <span class="text-sm text-(--ui-text-muted)">Technology</span>
              <p v-if="component.technologyName" class="font-medium">
                <NuxtLink :to="`/technologies/${encodeURIComponent(component.technologyName)}`" class="hover:underline">
                  {{ component.technologyName }}
                </NuxtLink>
              </p>
              <p v-else class="text-(--ui-text-muted)">Not linked</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-lg font-semibold">End-of-Life Visibility</h2>
              <UBadge :color="getEolColor(component.eol?.status)" variant="subtle">
                {{ getEolLabel(component.eol?.status) }}
              </UBadge>
            </div>
          </template>

          <div class="space-y-4">
            <p class="text-sm text-(--ui-text-muted)">
              Lifecycle data is provided by endoflife.date. Polaris displays this third-party information for visibility and does not manage or verify lifecycle policy data.
            </p>

            <UAlert
              v-if="!component.eol || component.eol.status === 'unknown'"
              color="neutral"
              variant="subtle"
              icon="i-lucide-circle-help"
              title="No lifecycle match available"
              :description="getEolUnknownDescription(component.eol?.reason)"
            />

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span class="text-sm text-(--ui-text-muted)">Product</span>
                <p class="font-medium">{{ component.eol.productLabel || component.eol.productName || '—' }}</p>
              </div>
              <div>
                <span class="text-sm text-(--ui-text-muted)">Matched Cycle</span>
                <p class="font-medium">{{ component.eol.matchedCycle || '—' }}</p>
              </div>
              <div>
                <span class="text-sm text-(--ui-text-muted)">End of Life</span>
                <p class="font-medium">{{ component.eol.eolDate ? formatDate(component.eol.eolDate) : '—' }}</p>
              </div>
              <div>
                <span class="text-sm text-(--ui-text-muted)">Active Support Ends</span>
                <p class="font-medium">{{ component.eol.supportEndDate ? formatDate(component.eol.supportEndDate) : '—' }}</p>
              </div>
              <div>
                <span class="text-sm text-(--ui-text-muted)">LTS</span>
                <p class="font-medium">{{ component.eol.lts === null ? '—' : component.eol.lts ? 'Yes' : 'No' }}</p>
              </div>
              <div>
                <span class="text-sm text-(--ui-text-muted)">Latest Version</span>
                <p class="font-medium">{{ component.eol.latestVersion || '—' }}</p>
              </div>
            </div>

            <UButton
              v-if="component.eol?.source.url"
              :to="component.eol.source.url"
              target="_blank"
              rel="noopener noreferrer"
              label="View Source"
              icon="i-lucide-external-link"
              variant="outline"
              size="sm"
            />
          </div>
        </UCard>
      </div>

      <UCard v-if="component.purl || component.cpe || component.bomRef">
        <template #header>
          <h2 class="text-lg font-semibold">Identifiers</h2>
        </template>
        <div class="space-y-3">
          <div v-if="component.purl">
            <span class="text-sm text-(--ui-text-muted)">Package URL</span>
            <p><code class="break-all">{{ component.purl }}</code></p>
          </div>
          <div v-if="component.cpe">
            <span class="text-sm text-(--ui-text-muted)">CPE</span>
            <p><code class="break-all">{{ component.cpe }}</code></p>
          </div>
          <div v-if="component.bomRef">
            <span class="text-sm text-(--ui-text-muted)">BOM Reference</span>
            <p><code class="break-all">{{ component.bomRef }}</code></p>
          </div>
        </div>
      </UCard>

      <UCard v-if="component.systems.length > 0">
        <template #header>
          <h2 class="text-lg font-semibold">Systems ({{ component.systems.length }})</h2>
        </template>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="system in component.systems"
            :key="system.name"
            :label="system.name"
            :to="`/systems/${encodeURIComponent(system.name)}`"
            variant="subtle"
            color="neutral"
            size="sm"
          >
            <template #trailing>
              <UBadge v-if="system.scope || system.isDirect !== null" color="neutral" variant="subtle" size="xs">
                {{ formatSystemUsage(system) }}
              </UBadge>
            </template>
          </UButton>
        </div>
      </UCard>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Licenses</h2>
          </template>
          <div v-if="component.licenses.length > 0" class="flex flex-wrap gap-2">
            <UBadge
              v-for="license in component.licenses"
              :key="license.id || license.name"
              color="neutral"
              variant="subtle"
            >
              {{ license.id || license.name }}
            </UBadge>
          </div>
          <p v-else class="text-(--ui-text-muted)">No license information available.</p>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">References</h2>
          </template>
          <div class="space-y-2">
            <UButton
              v-if="component.homepage"
              :to="component.homepage"
              target="_blank"
              rel="noopener noreferrer"
              label="Homepage"
              icon="i-lucide-external-link"
              variant="outline"
              size="sm"
            />
            <div v-if="component.externalReferences.length > 0" class="space-y-2">
              <UButton
                v-for="reference in component.externalReferences"
                :key="`${reference.type}:${reference.url}`"
                :to="reference.url"
                target="_blank"
                rel="noopener noreferrer"
                :label="reference.type"
                icon="i-lucide-external-link"
                variant="outline"
                size="sm"
              />
            </div>
            <p v-if="!component.homepage && component.externalReferences.length === 0" class="text-(--ui-text-muted)">
              No references available.
            </p>
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ComponentDetail, EOLStatusValue, ComponentSystemUsage } from '~~/types/api'

const route = useRoute()

interface ComponentDetailResponse {
  success: boolean
  data: ComponentDetail
}

const { data, pending, error } = await useFetch<ComponentDetailResponse>(
  () => `/api/components/${encodeURIComponent(route.params.key as string)}`
)

const component = computed(() => data.value?.data || null)
const displayName = computed(() => {
  if (!component.value) return 'Component'
  return component.value.group
    ? `${component.value.group}/${component.value.name}`
    : component.value.name
})

function getEolColor(status?: EOLStatusValue): 'success' | 'warning' | 'error' | 'neutral' {
  const colors: Record<EOLStatusValue, 'success' | 'warning' | 'error' | 'neutral'> = {
    active: 'success',
    approaching_eol: 'warning',
    unsupported: 'error',
    unknown: 'neutral'
  }
  return colors[status || 'unknown']
}

function getEolLabel(status?: EOLStatusValue): string {
  const labels: Record<EOLStatusValue, string> = {
    active: 'Active',
    approaching_eol: 'Approaching EOL',
    unsupported: 'Unsupported',
    unknown: 'Unknown'
  }
  return labels[status || 'unknown']
}

function getEolUnknownDescription(reason?: string): string {
  const descriptions: Record<string, string> = {
    no_mapping: 'No endoflife.date product mapping could be resolved for this component.',
    no_data: 'The mapped product was not available from the third-party lifecycle source.',
    no_matching_cycle: 'Lifecycle data exists for the product, but no release cycle matched this component version.',
    fetch_failed: 'The third-party lifecycle source could not be reached.'
  }
  return descriptions[reason || ''] || 'No lifecycle data is available from the configured third-party source.'
}

function formatDate(dateString: string): string {
  const iso = dateString.includes('T') ? dateString : `${dateString}T00:00:00Z`
  return new Date(iso).toLocaleDateString(undefined, { timeZone: 'UTC' })
}

function formatSystemUsage(system: ComponentSystemUsage): string {
  const labels = []
  if (system.scope) labels.push(system.scope)
  if (system.isDirect === true) labels.push('direct')
  if (system.isDirect === false) labels.push('transitive')
  return labels.join(', ')
}

useHead({
  title: computed(() => component.value ? `${displayName.value} ${component.value.version} - Polaris` : 'Component - Polaris')
})
</script>
