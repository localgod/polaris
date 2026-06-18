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
          :description="component.description || undefined"
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

      <div class="grid grid-cols-1 gap-6 xl:grid-cols-3 xl:items-start">
        <div class="space-y-6 xl:col-span-2">
          <UCard>
            <template #header>
              <div>
                <div>
                  <h2 class="text-lg font-semibold">Overview</h2>
                  <p class="text-sm text-(--ui-text-muted)">Canonical component data stored by Polaris.</p>
                </div>
              </div>
            </template>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span class="text-sm text-(--ui-text-muted)">Version</span>
                <p class="font-medium break-all">{{ component.version }}</p>
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
                <span class="text-sm text-(--ui-text-muted)">Systems</span>
                <p class="font-medium">{{ component.systemCount }}</p>
              </div>
              <div>
                <span class="text-sm text-(--ui-text-muted)">Licenses</span>
                <div v-if="component.licenses.length > 0" class="mt-1 flex flex-wrap gap-2">
                  <UBadge
                    v-for="license in component.licenses"
                    :key="license.id || license.name"
                    color="neutral"
                    variant="subtle"
                  >
                    {{ license.id || license.name }}
                  </UBadge>
                </div>
                <p v-else class="font-medium text-(--ui-text-muted)">No license information</p>
              </div>
              <div>
                <span class="text-sm text-(--ui-text-muted)">Direct Dependencies</span>
                <p class="font-medium">{{ directDependencyCount }}</p>
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
              <div>
                <span class="text-sm text-(--ui-text-muted)">External Signals</span>
                <div class="mt-1 flex flex-wrap gap-2">
                  <UBadge v-if="component.packageMetadata?.status === 'available'" color="success" variant="subtle">
                    {{ getPackageSourceLabel(component.packageMetadata.source.name) }}
                  </UBadge>
                  <UBadge v-if="component.eol?.source.url" color="neutral" variant="subtle">
                    endoflife.date
                  </UBadge>
                  <UBadge v-if="component.securityScorecard?.status === 'available'" color="success" variant="subtle">
                    Scorecard
                  </UBadge>
                  <span v-if="!hasExternalSignals" class="font-medium text-(--ui-text-muted)">None</span>
                </div>
              </div>
            </div>
          </UCard>

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
              <div v-if="component.bomRef && component.bomRef !== component.purl">
                <span class="text-sm text-(--ui-text-muted)">BOM Reference</span>
                <p><code class="break-all">{{ component.bomRef }}</code></p>
              </div>
            </div>
          </UCard>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <UCard>
              <template #header>
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <h2 class="text-lg font-semibold">Lifecycle</h2>
                    <p class="text-xs text-(--ui-text-muted)">Source: endoflife.date</p>
                  </div>
                  <UBadge :color="getEolColor(component.eol?.status)" variant="subtle">
                    {{ getEolLabel(component.eol?.status) }}
                  </UBadge>
                </div>
              </template>

              <div class="space-y-4">
                <UAlert
                  v-if="!component.eol || component.eol.status === 'unknown'"
                  color="neutral"
                  variant="subtle"
                  icon="i-lucide-circle-help"
                  title="No lifecycle match available"
                  :description="getEolUnknownDescription(component.eol?.reason)"
                />

                <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                  <div v-if="showLifecycleProduct">
                    <span class="text-sm text-(--ui-text-muted)">Matched Product</span>
                    <p class="font-medium">{{ lifecycleProductLabel }}</p>
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
                  <div v-if="showEolLatestVersion">
                    <span class="text-sm text-(--ui-text-muted)">Latest Version</span>
                    <p class="font-medium">{{ component.eol.latestVersion || '—' }}</p>
                  </div>
                </div>

                <UButton
                  v-if="component.eol?.source.url"
                  :to="component.eol.source.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  label="Open endoflife.date"
                  icon="i-lucide-external-link"
                  variant="outline"
                  size="sm"
                />
              </div>
            </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold">Registry</h2>
                <p class="text-xs text-(--ui-text-muted)">Source: {{ getPackageSourceLabel(component.packageMetadata?.source.name) }}</p>
              </div>
              <UBadge :color="getPackageMetadataColor(component.packageMetadata?.status)" variant="subtle">
                {{ getPackageMetadataLabel(component.packageMetadata?.status) }}
              </UBadge>
            </div>
          </template>

          <div class="space-y-4">
            <UAlert
              v-if="!component.packageMetadata || component.packageMetadata.status === 'unavailable'"
              color="neutral"
              variant="subtle"
              icon="i-lucide-circle-help"
              title="No package metadata available"
              :description="getPackageMetadataUnavailableDescription(component.packageMetadata?.reason)"
            />

            <template v-else>
              <UAlert
                v-if="component.packageMetadata.isDeprecated"
                color="warning"
                variant="subtle"
                icon="i-lucide-triangle-alert"
                title="Package version is deprecated"
                :description="component.packageMetadata.deprecatedReason || `${getPackageSourceLabel(component.packageMetadata.source.name)} reports this package version as deprecated.`"
              />

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                <div>
                  <span class="text-sm text-(--ui-text-muted)">Ecosystem</span>
                  <p class="font-medium">{{ component.packageMetadata.system || '—' }}</p>
                </div>
                <div v-if="showPackageLatestVersion">
                  <span class="text-sm text-(--ui-text-muted)">Latest Version</span>
                  <p class="font-medium break-all">{{ component.packageMetadata.latestVersion || '—' }}</p>
                </div>
                <div>
                  <span class="text-sm text-(--ui-text-muted)">Published</span>
                  <p class="font-medium">{{ component.packageMetadata.publishedAt ? formatDate(component.packageMetadata.publishedAt) : '—' }}</p>
                </div>
                <div>
                  <span class="text-sm text-(--ui-text-muted)">Recent Releases</span>
                  <p class="font-medium">{{ component.packageMetadata.recentReleases ?? '—' }}</p>
                </div>
                <div>
                  <span class="text-sm text-(--ui-text-muted)">Advisories</span>
                  <p class="font-medium">{{ component.packageMetadata.advisoryCount ?? '—' }}</p>
                </div>
              </div>

              <div v-if="showRegistryLicenses">
                <span class="text-sm text-(--ui-text-muted)">Licenses</span>
                <div v-if="component.packageMetadata.licenses.length > 0" class="mt-2 flex flex-wrap gap-2">
                  <UBadge
                    v-for="license in component.packageMetadata.licenses"
                    :key="license"
                    color="neutral"
                    variant="subtle"
                  >
                    {{ license }}
                  </UBadge>
                </div>
                <p v-else class="font-medium">—</p>
              </div>

              <div v-if="component.packageMetadata.advisories.length > 0">
                <span class="text-sm text-(--ui-text-muted)">Advisory Links</span>
                <div class="mt-2 flex flex-wrap gap-2">
                  <UButton
                    v-for="advisory in component.packageMetadata.advisories"
                    :key="advisory.id"
                    :to="advisory.url || undefined"
                    target="_blank"
                    rel="noopener noreferrer"
                    :label="advisory.id"
                    icon="i-lucide-shield-alert"
                    variant="outline"
                    color="warning"
                    size="sm"
                  />
                </div>
              </div>
            </template>

            <UButton
              v-if="component.packageMetadata?.source.url"
              :to="component.packageMetadata.source.url"
              target="_blank"
              rel="noopener noreferrer"
              :label="`Open ${getPackageSourceLabel(component.packageMetadata.source.name)}`"
              icon="i-lucide-external-link"
              variant="outline"
              size="sm"
            />
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold">Security</h2>
                <p class="text-xs text-(--ui-text-muted)">Source: OpenSSF Scorecard</p>
              </div>
              <UBadge :color="getSecurityScorecardColor(component.securityScorecard?.score, component.securityScorecard?.status)" variant="subtle">
                {{ getSecurityScorecardLabel(component.securityScorecard?.score, component.securityScorecard?.status) }}
              </UBadge>
            </div>
          </template>

          <div class="space-y-4">
            <UAlert
              v-if="!component.securityScorecard || component.securityScorecard.status === 'unavailable'"
              color="neutral"
              variant="subtle"
              icon="i-lucide-circle-help"
              title="No security scorecard available"
              :description="getSecurityScorecardUnavailableDescription(component.securityScorecard?.reason)"
            />

            <template v-else>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                <div>
                  <span class="text-sm text-(--ui-text-muted)">Repository</span>
                  <p class="font-medium break-all">
                    {{ component.securityScorecard.repository ? `${component.securityScorecard.repository.owner}/${component.securityScorecard.repository.name}` : '—' }}
                  </p>
                </div>
                <div>
                  <span class="text-sm text-(--ui-text-muted)">Overall Score</span>
                  <p class="font-medium">{{ formatScore(component.securityScorecard.score) }}</p>
                </div>
                <div>
                  <span class="text-sm text-(--ui-text-muted)">Scanned</span>
                  <p class="font-medium">{{ component.securityScorecard.scannedAt ? formatDate(component.securityScorecard.scannedAt) : '—' }}</p>
                </div>
              </div>

              <div v-if="component.securityScorecard.checks.length > 0">
                <span class="text-sm text-(--ui-text-muted)">Selected Checks</span>
                <div class="mt-2 space-y-2">
                  <div
                    v-for="check in component.securityScorecard.checks"
                    :key="check.name"
                    class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div>
                      <p class="font-medium">{{ check.name }}</p>
                      <p v-if="check.reason" class="text-sm text-(--ui-text-muted)">{{ check.reason }}</p>
                    </div>
                    <UBadge :color="getSecurityCheckColor(check.score)" variant="subtle">
                      {{ formatScore(check.score) }}
                    </UBadge>
                  </div>
                </div>
              </div>
            </template>

            <UButton
              v-if="component.securityScorecard?.source.url"
              :to="component.securityScorecard.source.url"
              target="_blank"
              rel="noopener noreferrer"
              label="Open Scorecard"
              icon="i-lucide-external-link"
              variant="outline"
              size="sm"
            />
          </div>
        </UCard>
      </div>

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
        </div>

        <div class="xl:col-span-1">
          <UCard class="xl:sticky xl:top-6">
            <template #header>
              <div class="flex flex-col gap-3">
                <div>
                  <h2 class="text-lg font-semibold">Dependencies</h2>
                  <p class="text-sm text-(--ui-text-muted)">
                    {{ directDependencyCount }} {{ directDependencyCount === 1 ? 'direct dependency' : 'direct dependencies' }}
                  </p>
                </div>
                <div v-if="dependencySystemContext" class="flex flex-wrap items-center gap-2">
                  <UButton
                    label="All"
                    icon="i-lucide-globe"
                    size="sm"
                    :variant="dependencyView === 'global' ? 'solid' : 'outline'"
                    :color="dependencyView === 'global' ? 'primary' : 'neutral'"
                    @click="setDependencyView('global')"
                  />
                  <UButton
                    :label="dependencySystemContext"
                    icon="i-lucide-boxes"
                    size="sm"
                    :variant="dependencyView === 'system' ? 'solid' : 'outline'"
                    :color="dependencyView === 'system' ? 'primary' : 'neutral'"
                    @click="setDependencyView('system')"
                  />
                </div>
                <UBadge
                  v-else
                  color="neutral"
                  variant="subtle"
                  class="w-fit"
                >
                  Global view
                </UBadge>
              </div>
            </template>

            <ComponentDependencyTree
              :component-key="route.params.key as string"
              :system-name="activeDependencySystem"
            />
          </UCard>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ComponentDetail, EOLStatusValue, ComponentSystemUsage, PackageMetadataSource, PackageMetadataStatus, SecurityScorecardStatus } from '~~/types/api'

const route = useRoute()
const router = useRouter()

type DependencyView = 'global' | 'system'

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
const directDependencyCount = computed(() => {
  const directDependencies = component.value?.directDependencies
  return Array.isArray(directDependencies) ? directDependencies.length : 0
})
const dependencySystemContext = computed(() => firstQueryValue(route.query.fromSystem))
const dependencyView = computed<DependencyView>(() => {
  const requestedView = firstQueryValue(route.query.dependencyView)
  if (requestedView === 'global' || requestedView === 'system') return requestedView
  return dependencySystemContext.value ? 'system' : 'global'
})
const activeDependencySystem = computed(() => (
  dependencyView.value === 'system' ? dependencySystemContext.value : undefined
))
const lifecycleProductLabel = computed(() => (
  component.value?.eol?.productLabel || component.value?.eol?.productName || ''
))
const showLifecycleProduct = computed(() => {
  if (!component.value || !lifecycleProductLabel.value) return false
  return lifecycleProductLabel.value.toLowerCase() !== displayName.value.toLowerCase()
})
const showEolLatestVersion = computed(() => {
  const latestVersion = component.value?.eol?.latestVersion
  return Boolean(latestVersion && latestVersion !== component.value?.version)
})
const showPackageLatestVersion = computed(() => {
  const latestVersion = component.value?.packageMetadata?.latestVersion
  return Boolean(latestVersion && latestVersion !== component.value?.version)
})
const showRegistryLicenses = computed(() => {
  const registryLicenses = component.value?.packageMetadata?.licenses ?? []
  if (registryLicenses.length === 0) return false
  const componentLicenses = new Set(
    (component.value?.licenses ?? [])
      .map(license => license.id || license.name)
      .filter(Boolean)
  )
  return registryLicenses.some(license => !componentLicenses.has(license))
})
const hasExternalSignals = computed(() => Boolean(
  component.value?.packageMetadata?.status === 'available'
  || component.value?.eol?.source.url
  || component.value?.securityScorecard?.status === 'available'
))

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

function getPackageMetadataColor(status?: PackageMetadataStatus): 'success' | 'neutral' {
  return status === 'available' ? 'success' : 'neutral'
}

function getPackageMetadataLabel(status?: PackageMetadataStatus): string {
  return status === 'available' ? 'Available' : 'Unavailable'
}

function getPackageSourceLabel(source?: PackageMetadataSource): string {
  const labels: Record<PackageMetadataSource, string> = {
    'deps.dev': 'deps.dev',
    npm: 'npm',
    pypi: 'PyPI',
    maven: 'Maven Central'
  }
  return source ? labels[source] : 'deps.dev'
}

function getPackageMetadataUnavailableDescription(reason?: string): string {
  const descriptions: Record<string, string> = {
    missing_purl: 'This component does not have a package URL to look up in deps.dev.',
    malformed_purl: 'The package URL could not be parsed for deps.dev lookup.',
    unsupported_ecosystem: 'deps.dev package metadata is not available for this package ecosystem.',
    package_not_found: 'deps.dev did not find this package.',
    version_not_found: 'deps.dev found the package, but not this component version.',
    fetch_failed: 'The third-party package metadata source could not be reached.'
  }
  return descriptions[reason || ''] || 'No package metadata is available from the configured third-party source.'
}

function getSecurityScorecardColor(score?: number | null, status?: SecurityScorecardStatus): 'success' | 'warning' | 'error' | 'neutral' {
  if (status !== 'available' || score === null || score === undefined) return 'neutral'
  if (score >= 8) return 'success'
  if (score >= 5) return 'warning'
  return 'error'
}

function getSecurityCheckColor(score?: number | null): 'success' | 'warning' | 'error' | 'neutral' {
  return getSecurityScorecardColor(score, 'available')
}

function getSecurityScorecardLabel(score?: number | null, status?: SecurityScorecardStatus): string {
  if (status !== 'available') return 'Unavailable'
  return formatScore(score)
}

function getSecurityScorecardUnavailableDescription(reason?: string): string {
  const descriptions: Record<string, string> = {
    missing_repository: 'This component does not have a repository reference for OpenSSF Scorecard lookup.',
    unsupported_repository: 'OpenSSF Scorecard is only available for public GitHub repositories.',
    repository_not_found: 'OpenSSF Scorecard did not find a score for this GitHub repository.',
    fetch_failed: 'The third-party security score source could not be reached.'
  }
  return descriptions[reason || ''] || 'No security scorecard data is available from the configured third-party source.'
}

function formatScore(score?: number | null): string {
  return typeof score === 'number' ? `${score.toFixed(1)} / 10` : '—'
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

function firstQueryValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value
  if (Array.isArray(value)) {
    const first = value.find(item => typeof item === 'string' && item.trim())
    return typeof first === 'string' ? first : undefined
  }
  return undefined
}

async function setDependencyView(view: DependencyView) {
  await router.replace({
    query: {
      ...route.query,
      dependencyView: view
    }
  })
}

useHead({
  title: computed(() => component.value ? `${displayName.value} ${component.value.version} - Polaris` : 'Component - Polaris')
})
</script>
