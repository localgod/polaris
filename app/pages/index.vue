<template>
  <div class="space-y-6">
    <UPageHeader
      title="Dashboard"
      description="Enterprise Technology Catalog Overview"
    />

    <!-- Quick Navigation -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="block p-4 rounded-lg border border-(--ui-border) bg-(--ui-bg) hover:bg-(--ui-bg-elevated) transition-colors text-center"
      >
        <UIcon :name="item.icon" class="w-6 h-6 mx-auto mb-2 text-(--ui-text-muted)" />
        <p class="text-2xl font-bold" :class="item.valueClass">{{ item.value }}</p>
        <p class="text-sm text-(--ui-text-muted) mt-1">{{ item.title }}</p>
      </NuxtLink>
    </div>

    <!-- Statistics Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="font-semibold">Systems by Criticality</h3>
            <NuxtLink to="/systems" class="text-sm text-(--ui-color-primary-500)">View all →</NuxtLink>
          </div>
        </template>
        <div class="grid grid-cols-4 gap-2 text-center">
          <div>
            <p class="text-sm text-(--ui-text-muted)">Critical</p>
            <p class="text-xl font-bold text-(--ui-color-error-500)">{{ criticalityCounts.critical }}</p>
          </div>
          <div>
            <p class="text-sm text-(--ui-text-muted)">High</p>
            <p class="text-xl font-bold text-(--ui-color-warning-500)">{{ criticalityCounts.high }}</p>
          </div>
          <div>
            <p class="text-sm text-(--ui-text-muted)">Medium</p>
            <p class="text-xl font-bold text-(--ui-color-success-500)">{{ criticalityCounts.medium }}</p>
          </div>
          <div>
            <p class="text-sm text-(--ui-text-muted)">Low</p>
            <p class="text-xl font-bold">{{ criticalityCounts.low }}</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="font-semibold">Licenses by Category</h3>
            <NuxtLink to="/licenses" class="text-sm text-(--ui-color-primary-500)">View all →</NuxtLink>
          </div>
        </template>
        <div class="grid grid-cols-4 gap-2 text-center">
          <div>
            <p class="text-sm text-(--ui-text-muted)">Total</p>
            <p class="text-xl font-bold">{{ licenseStats.total }}</p>
          </div>
          <div>
            <p class="text-sm text-(--ui-text-muted)">Permissive</p>
            <p class="text-xl font-bold text-(--ui-color-success-500)">{{ licenseStats.permissive }}</p>
          </div>
          <div>
            <p class="text-sm text-(--ui-text-muted)">Copyleft</p>
            <p class="text-xl font-bold text-(--ui-color-warning-500)">{{ licenseStats.copyleft }}</p>
          </div>
          <div>
            <p class="text-sm text-(--ui-text-muted)">Violations</p>
            <p class="text-xl font-bold text-(--ui-color-error-500)">{{ licenseStats.disallowed }}</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="font-semibold">Version Violations</h3>
            <NuxtLink to="/violations" class="text-sm text-(--ui-color-primary-500)">View all →</NuxtLink>
          </div>
        </template>
        <div class="grid grid-cols-4 gap-2 text-center">
          <div>
            <p class="text-sm text-(--ui-text-muted)">Total</p>
            <p class="text-xl font-bold text-(--ui-color-error-500)">{{ violationStats.total }}</p>
          </div>
          <div>
            <p class="text-sm text-(--ui-text-muted)">Critical</p>
            <p class="text-xl font-bold text-(--ui-color-error-500)">{{ violationStats.critical }}</p>
          </div>
          <div>
            <p class="text-sm text-(--ui-text-muted)">Error</p>
            <p class="text-xl font-bold text-(--ui-color-warning-500)">{{ violationStats.error }}</p>
          </div>
          <div>
            <p class="text-sm text-(--ui-text-muted)">Warning</p>
            <p class="text-xl font-bold">{{ violationStats.warning }}</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="font-semibold">Lifecycle Risk</h3>
            <NuxtLink :to="{ path: '/components', query: { lifecycleRisk: 'true' } }" class="text-sm text-(--ui-color-primary-500)">View components →</NuxtLink>
          </div>
        </template>
        <div class="grid grid-cols-3 gap-2 text-center">
          <div>
            <p class="text-sm text-(--ui-text-muted)">Unsupported</p>
            <p class="text-xl font-bold text-(--ui-color-error-500)">{{ lifecycleStats.unsupported }}</p>
          </div>
          <div>
            <p class="text-sm text-(--ui-text-muted)">Approaching</p>
            <p class="text-xl font-bold text-(--ui-color-warning-500)">{{ lifecycleStats.approaching }}</p>
          </div>
          <div>
            <p class="text-sm text-(--ui-text-muted)">Systems</p>
            <p class="text-xl font-bold">{{ lifecycleStats.systems }}</p>
          </div>
        </div>
      </UCard>
    </div>

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
    criticality: {
      critical: number
      high: number
      medium: number
      low: number
    }
    licenses: {
      total: number
      permissive: number
      copyleft: number
      disallowed: number
    }
    violations: {
      total: number
      critical: number
      error: number
      warning: number
    }
    lifecycle: {
      unsupported: number
      approaching: number
      systems: number
    }
  }
}

const { data: dashboardData } = await useFetch<DashboardSummaryResponse>('/api/dashboard')

const summary = computed(() => dashboardData.value?.data)

const counts = computed(() => ({
  technologies: summary.value?.counts.technologies || 0,
  systems: summary.value?.counts.systems || 0,
  components: summary.value?.counts.components || 0,
  versionConstraints: summary.value?.counts.versionConstraints || 0,
  violations: summary.value?.counts.violations || 0,
  licenseViolations: summary.value?.counts.licenseViolations || 0
}))

const navItems = computed(() => [
  { title: 'Technologies', value: counts.value.technologies, icon: 'i-lucide-settings', to: '/technologies', valueClass: 'text-(--ui-color-primary-500)' },
  { title: 'Systems', value: counts.value.systems, icon: 'i-lucide-cpu', to: '/systems', valueClass: 'text-(--ui-color-success-500)' },
  { title: 'Components', value: counts.value.components, icon: 'i-lucide-box', to: '/components', valueClass: 'text-(--ui-color-warning-500)' },
  { title: 'Version Constraints', value: counts.value.versionConstraints, icon: 'i-lucide-file-text', to: '/version-constraints', valueClass: '' },
  { title: 'Violations', value: counts.value.violations, icon: 'i-lucide-alert-triangle', to: '/violations', valueClass: 'text-(--ui-color-error-500)' },
  { title: 'License Violations', value: counts.value.licenseViolations, icon: 'i-lucide-scale', to: '/violations/licenses', valueClass: 'text-(--ui-color-error-500)' }
])

const criticalityCounts = computed(() => ({
  critical: summary.value?.criticality.critical || 0,
  high: summary.value?.criticality.high || 0,
  medium: summary.value?.criticality.medium || 0,
  low: summary.value?.criticality.low || 0
}))

const licenseStats = computed(() => ({
  total: summary.value?.licenses.total || 0,
  permissive: summary.value?.licenses.permissive || 0,
  copyleft: summary.value?.licenses.copyleft || 0,
  disallowed: summary.value?.licenses.disallowed || 0
}))

const violationStats = computed(() => ({
  total: summary.value?.violations.total || 0,
  critical: summary.value?.violations.critical || 0,
  error: summary.value?.violations.error || 0,
  warning: summary.value?.violations.warning || 0
}))

const lifecycleStats = computed(() => ({
  unsupported: summary.value?.lifecycle.unsupported || 0,
  approaching: summary.value?.lifecycle.approaching || 0,
  systems: summary.value?.lifecycle.systems || 0
}))

useHead({ title: 'Dashboard - Polaris' })
</script>
