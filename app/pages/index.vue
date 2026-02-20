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
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
import type { ApiResponse, Technology, System, Component, VersionConstraint } from '~~/types/api'

interface LicenseStatsResponse {
  success: boolean
  data: Array<{
    total: number
    osiApproved: number
    byCategory: Record<string, number>
  }>
}

interface LicenseViolationsResponse {
  success: boolean
  data: unknown[]
  count: number
}

interface ViolationsResponse {
  success: boolean
  count: number
  summary: {
    critical: number
    error: number
    warning: number
    info: number
  }
}

const { data: techData } = await useFetch<ApiResponse<Technology>>('/api/technologies')
const { data: sysData } = await useFetch<ApiResponse<System>>('/api/systems')
const { data: compData } = await useFetch<ApiResponse<Component>>('/api/components')
const { data: vcData } = await useFetch<ApiResponse<VersionConstraint>>('/api/version-constraints')
const { data: licenseStatsData } = await useFetch<LicenseStatsResponse>('/api/licenses/statistics')
const { data: licenseViolationsData } = await useFetch<LicenseViolationsResponse>('/api/licenses/violations')
const { data: vcViolationsData } = await useFetch<ViolationsResponse>('/api/version-constraints/violations')

const techCount = useApiCount(techData)
const sysCount = useApiCount(sysData)
const compCount = useApiCount(compData)
const vcCount = useApiCount(vcData)
const violationsCount = computed(() => vcViolationsData.value?.count || 0)
const licenseViolationsCount = computed(() => licenseViolationsData.value?.count || 0)

const navItems = computed(() => [
  { title: 'Technologies', value: techCount.value, icon: 'i-lucide-settings', to: '/technologies', valueClass: 'text-(--ui-color-primary-500)' },
  { title: 'Systems', value: sysCount.value, icon: 'i-lucide-cpu', to: '/systems', valueClass: 'text-(--ui-color-success-500)' },
  { title: 'Components', value: compCount.value, icon: 'i-lucide-box', to: '/components', valueClass: 'text-(--ui-color-warning-500)' },
  { title: 'Version Constraints', value: vcCount.value, icon: 'i-lucide-file-text', to: '/version-constraints', valueClass: '' },
  { title: 'Violations', value: violationsCount.value, icon: 'i-lucide-alert-triangle', to: '/violations', valueClass: 'text-(--ui-color-error-500)' },
  { title: 'License Violations', value: licenseViolationsCount.value, icon: 'i-lucide-scale', to: '/violations/licenses', valueClass: 'text-(--ui-color-error-500)' }
])

const criticalityCounts = computed(() => {
  const systems = sysData.value?.data || []
  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  systems.forEach((sys: System) => {
    const criticality = sys.businessCriticality?.toLowerCase()
    if (criticality === 'critical') counts.critical++
    else if (criticality === 'high') counts.high++
    else if (criticality === 'medium') counts.medium++
    else if (criticality === 'low') counts.low++
  })
  return counts
})

const licenseStats = computed(() => {
  const statsData = licenseStatsData.value?.data?.[0]
  return {
    total: statsData?.total || 0,
    permissive: statsData?.byCategory?.permissive || 0,
    copyleft: statsData?.byCategory?.copyleft || 0,
    disallowed: licenseViolationsCount.value
  }
})

const violationStats = computed(() => {
  const data = vcViolationsData.value
  return {
    total: data?.count || 0,
    critical: data?.summary?.critical || 0,
    error: data?.summary?.error || 0,
    warning: data?.summary?.warning || 0
  }
})

useHead({ title: 'Dashboard - Polaris' })
</script>
