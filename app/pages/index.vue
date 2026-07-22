<template>
  <div class="space-y-6">
    <UPageHeader
      title="Dashboard"
      description="Enterprise Technology Catalog Overview"
    />

    <!-- Needs Attention -->
    <div class="space-y-3">
      <h2 class="text-lg font-semibold">Needs Attention</h2>

      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-semibold">Vulnerability Exposure</h3>
              <UIcon name="i-lucide-shield-alert" class="size-5 text-(--ui-color-error-500)" />
            </div>
          </template>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div>
              <p class="text-sm text-(--ui-text-muted)">Critical</p>
              <p class="text-xl font-bold text-(--ui-color-error-500)">{{ attention.vulnerabilityExposure.criticalComponents }}</p>
            </div>
            <div>
              <p class="text-sm text-(--ui-text-muted)">High</p>
              <p class="text-xl font-bold text-(--ui-color-warning-500)">{{ attention.vulnerabilityExposure.highComponents }}</p>
            </div>
            <div>
              <p class="text-sm text-(--ui-text-muted)">Systems</p>
              <p class="text-xl font-bold">{{ attention.vulnerabilityExposure.affectedSystems }}</p>
            </div>
          </div>
          <NuxtLink to="/components" class="text-sm text-(--ui-color-primary-500) mt-3 block">Review vulnerable components →</NuxtLink>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-semibold">Advisory Hotspots</h3>
              <UIcon name="i-lucide-radar" class="size-5 text-(--ui-color-warning-500)" />
            </div>
          </template>
          <div v-if="attention.advisoryHotspots.length > 0" class="space-y-3">
            <div
              v-for="advisory in attention.advisoryHotspots"
              :key="advisory.id"
              class="flex items-center justify-between gap-3"
            >
              <div class="min-w-0">
                <p class="font-medium truncate">{{ advisory.aliases[0] || advisory.id }}</p>
                <p class="text-xs text-(--ui-text-muted)">{{ advisory.affectedSystems }} systems · {{ advisory.affectedComponents }} components</p>
              </div>
              <UBadge color="warning" variant="subtle">
                {{ advisory.cvssScore ?? '—' }}
              </UBadge>
            </div>
          </div>
          <p v-else class="text-sm text-(--ui-text-muted)">No active advisories observed.</p>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-semibold">Compliance Violations</h3>
              <UIcon name="i-lucide-gavel" class="size-5 text-(--ui-color-error-500)" />
            </div>
          </template>
          <div v-if="attention.complianceViolations.topViolations.length > 0" class="space-y-3">
            <NuxtLink
              v-for="(violation, idx) in attention.complianceViolations.topViolations"
              :key="`${violation.team}-${violation.technology}-${idx}`"
              :to="`/teams/${encodeURIComponent(violation.team)}`"
              class="flex items-center justify-between gap-3 hover:text-(--ui-color-primary-500)"
            >
              <div class="min-w-0">
                <p class="font-medium truncate">{{ violation.team }} · {{ violation.technology }}</p>
                <p class="text-xs text-(--ui-text-muted)">{{ violation.systemCount }} system{{ violation.systemCount === 1 ? '' : 's' }} affected</p>
              </div>
              <UBadge :color="getSeverityColor(violation.violationType === 'eliminated' ? 'critical' : 'warning')" variant="subtle">
                {{ violation.violationType }}
              </UBadge>
            </NuxtLink>
            <p class="text-xs text-(--ui-text-muted)">{{ attention.complianceViolations.total }} violations across {{ attention.complianceViolations.teamsAffected }} teams.</p>
          </div>
          <p v-else class="text-sm text-(--ui-text-muted)">No compliance violations observed.</p>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-semibold">Version Constraint Violations</h3>
              <UIcon name="i-lucide-alert-triangle" class="size-5 text-(--ui-color-error-500)" />
            </div>
          </template>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div>
              <p class="text-sm text-(--ui-text-muted)">Critical</p>
              <p class="text-xl font-bold text-(--ui-color-error-500)">{{ attention.versionConstraintViolations.critical }}</p>
            </div>
            <div>
              <p class="text-sm text-(--ui-text-muted)">Error</p>
              <p class="text-xl font-bold text-(--ui-color-warning-500)">{{ attention.versionConstraintViolations.error }}</p>
            </div>
            <div>
              <p class="text-sm text-(--ui-text-muted)">Warning</p>
              <p class="text-xl font-bold">{{ attention.versionConstraintViolations.warning }}</p>
            </div>
          </div>
          <NuxtLink to="/violations" class="text-sm text-(--ui-color-primary-500) mt-3 block">Review violations →</NuxtLink>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-semibold">Unsupported / EOL Components</h3>
              <UIcon name="i-lucide-calendar-x" class="size-5 text-(--ui-color-error-500)" />
            </div>
          </template>
          <div v-if="attention.eolExposure.topItems.length > 0" class="space-y-3">
            <div
              v-for="item in attention.eolExposure.topItems"
              :key="`${item.name}-${item.version}`"
              class="flex items-center justify-between gap-3"
            >
              <div class="min-w-0">
                <p class="font-medium truncate">{{ item.name }}{{ item.version ? ` @ ${item.version}` : '' }}</p>
              </div>
              <UBadge color="error" variant="subtle">
                {{ item.systemCount }} system{{ item.systemCount === 1 ? '' : 's' }}
              </UBadge>
            </div>
          </div>
          <p v-else class="text-sm text-(--ui-text-muted)">Nothing past end-of-life.</p>
          <NuxtLink :to="{ path: '/components', query: { lifecycleRisk: 'true' } }" class="text-sm text-(--ui-color-primary-500) mt-3 block">
            {{ attention.eolExposure.total }} component{{ attention.eolExposure.total === 1 ? '' : 's' }} past EOL →
          </NuxtLink>
        </UCard>

        <UCard v-if="attention.componentLinkQueue">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-semibold">Component Link Queue</h3>
              <UIcon name="i-lucide-link" class="size-5 text-(--ui-color-primary-500)" />
            </div>
          </template>
          <p class="text-xl font-bold text-center">{{ attention.componentLinkQueue.total }}</p>
          <p class="text-sm text-(--ui-text-muted) text-center">component{{ attention.componentLinkQueue.total === 1 ? '' : 's' }} awaiting a technology claim</p>
          <NuxtLink to="/admin/component-links" class="text-sm text-(--ui-color-primary-500) mt-3 block">Triage queue →</NuxtLink>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-semibold">Stewardship &amp; Ownership Gaps</h3>
              <UIcon name="i-lucide-user-x" class="size-5 text-(--ui-color-warning-500)" />
            </div>
          </template>
          <div v-if="hasStewardshipGaps" class="space-y-2">
            <NuxtLink
              v-for="name in attention.stewardshipGaps.sampleTechnologies"
              :key="`tech-${name}`"
              :to="`/technologies/${encodeURIComponent(name)}`"
              class="flex items-center justify-between gap-2 hover:text-(--ui-color-primary-500)"
            >
              <span class="truncate">{{ name }}</span>
              <UBadge color="warning" variant="subtle">no steward</UBadge>
            </NuxtLink>
            <NuxtLink
              v-for="name in attention.stewardshipGaps.samplePlatforms"
              :key="`platform-${name}`"
              :to="`/platforms/${encodeURIComponent(name)}`"
              class="flex items-center justify-between gap-2 hover:text-(--ui-color-primary-500)"
            >
              <span class="truncate">{{ name }}</span>
              <UBadge color="warning" variant="subtle">no steward</UBadge>
            </NuxtLink>
            <NuxtLink
              v-for="name in attention.stewardshipGaps.sampleSystems"
              :key="`system-${name}`"
              :to="`/systems/${encodeURIComponent(name)}`"
              class="flex items-center justify-between gap-2 hover:text-(--ui-color-primary-500)"
            >
              <span class="truncate">{{ name }}</span>
              <UBadge color="warning" variant="subtle">no owner</UBadge>
            </NuxtLink>
            <p class="text-xs text-(--ui-text-muted)">
              {{ attention.stewardshipGaps.unstewardedTechnologies + attention.stewardshipGaps.unstewardedPlatforms }} unstewarded,
              {{ attention.stewardshipGaps.unownedSystems }} unowned.
            </p>
          </div>
          <p v-else class="text-sm text-(--ui-text-muted)">Every technology, platform, and system has an accountable team.</p>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-semibold">Refresh Coverage</h3>
              <UIcon name="i-lucide-refresh-cw" class="size-5 text-(--ui-color-primary-500)" />
            </div>
          </template>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div>
              <p class="text-sm text-(--ui-text-muted)">Stale</p>
              <p class="text-xl font-bold text-(--ui-color-warning-500)">{{ attention.refreshCoverage.staleComponents }}</p>
            </div>
            <div>
              <p class="text-sm text-(--ui-text-muted)">Never</p>
              <p class="text-xl font-bold">{{ attention.refreshCoverage.neverCheckedComponents }}</p>
            </div>
            <div>
              <p class="text-sm text-(--ui-text-muted)">Failed</p>
              <p class="text-xl font-bold text-(--ui-color-error-500)">{{ attention.refreshCoverage.failedItems }}</p>
            </div>
          </div>
          <p class="text-xs text-(--ui-text-muted) mt-3">{{ attention.refreshCoverage.refreshedComponents }} of {{ attention.refreshCoverage.totalComponents }} direct components checked.</p>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <h3 class="font-semibold">Import Job Health</h3>
              <UIcon name="i-lucide-download" class="size-5 text-(--ui-color-primary-500)" />
            </div>
          </template>
          <div v-if="attention.importJobHealth.jobs.length > 0" class="space-y-3">
            <div
              v-for="job in attention.importJobHealth.jobs"
              :key="job.id"
              class="flex items-center justify-between gap-3"
            >
              <span class="truncate">{{ job.organization }}</span>
              <UBadge :color="job.status === 'failed' ? 'error' : 'info'" variant="subtle">
                {{ job.status }}
              </UBadge>
            </div>
          </div>
          <p v-else class="text-sm text-(--ui-text-muted)">No running or recently failed import jobs.</p>
          <NuxtLink to="/systems" class="text-sm text-(--ui-color-primary-500) mt-3 block">View imports →</NuxtLink>
        </UCard>
      </div>
    </div>

    <!-- Catalog -->
    <UCard>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <NuxtLink to="/technologies" class="hover:text-(--ui-color-primary-500)">
          <p class="text-2xl font-bold">{{ counts.technologies }}</p>
          <p class="text-sm text-(--ui-text-muted)">Technologies</p>
        </NuxtLink>
        <NuxtLink to="/systems" class="hover:text-(--ui-color-primary-500)">
          <p class="text-2xl font-bold">{{ counts.systems }}</p>
          <p class="text-sm text-(--ui-text-muted)">Systems</p>
        </NuxtLink>
        <NuxtLink to="/components" class="hover:text-(--ui-color-primary-500)">
          <p class="text-2xl font-bold">{{ counts.components }}</p>
          <p class="text-sm text-(--ui-text-muted)">Components</p>
        </NuxtLink>
        <NuxtLink to="/version-constraints" class="hover:text-(--ui-color-primary-500)">
          <p class="text-2xl font-bold">{{ counts.versionConstraints }}</p>
          <p class="text-sm text-(--ui-text-muted)">Version Constraints</p>
        </NuxtLink>
      </div>
    </UCard>

    <!-- Quick Links -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <UPageCard
        title="Technologies"
        description="Browse approved technologies and versions"
        icon="i-lucide-settings"
        to="/technologies"
        variant="subtle"
      />
      <UPageCard
        title="Systems"
        description="View applications and dependencies"
        icon="i-lucide-cpu"
        to="/systems"
        variant="subtle"
      />
      <UPageCard
        title="Components"
        description="SBOM entries across systems"
        icon="i-lucide-box"
        to="/components"
        variant="subtle"
      />
      <UPageCard
        title="Documentation"
        description="Learn about Polaris features"
        icon="i-lucide-book-open"
        to="/docs/concepts"
        variant="subtle"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DashboardAttentionSummary } from '~~/types/api'

interface DashboardSummaryResponse {
  success: boolean
  data: {
    counts: {
      technologies: number
      systems: number
      components: number
      versionConstraints: number
      violations: number
      licenseViolations: number
    }
  }
}

const { data: dashboardData } = await useFetch<DashboardSummaryResponse>('/api/dashboard')

interface AttentionApiResponse {
  success: boolean
  data: DashboardAttentionSummary
}

const { data: attentionData } = await useFetch<AttentionApiResponse>('/api/dashboard/attention')

const counts = computed(() => ({
  technologies: dashboardData.value?.data.counts.technologies || 0,
  systems: dashboardData.value?.data.counts.systems || 0,
  components: dashboardData.value?.data.counts.components || 0,
  versionConstraints: dashboardData.value?.data.counts.versionConstraints || 0
}))

const emptyAttention: DashboardAttentionSummary = {
  vulnerabilityExposure: {
    vulnerableComponents: 0,
    criticalComponents: 0,
    highComponents: 0,
    affectedSystems: 0,
    criticalVulnerabilities: 0,
    highVulnerabilities: 0
  },
  advisoryHotspots: [],
  refreshCoverage: {
    totalComponents: 0,
    refreshedComponents: 0,
    staleComponents: 0,
    neverCheckedComponents: 0,
    failedItems: 0
  },
  eolExposure: { total: 0, topItems: [] },
  complianceViolations: { total: 0, teamsAffected: 0, topViolations: [] },
  versionConstraintViolations: { total: 0, critical: 0, error: 0, warning: 0 },
  componentLinkQueue: null,
  stewardshipGaps: {
    unstewardedTechnologies: 0,
    unstewardedPlatforms: 0,
    unownedSystems: 0,
    sampleTechnologies: [],
    samplePlatforms: [],
    sampleSystems: []
  },
  importJobHealth: { total: 0, jobs: [] }
}

const attention = computed(() => attentionData.value?.data || emptyAttention)

const hasStewardshipGaps = computed(() =>
  attention.value.stewardshipGaps.sampleTechnologies.length > 0
  || attention.value.stewardshipGaps.samplePlatforms.length > 0
  || attention.value.stewardshipGaps.sampleSystems.length > 0
)

useHead({ title: 'Dashboard - Polaris' })
</script>
