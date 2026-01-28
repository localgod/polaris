<template>
  <div class="space-y">
    <!-- Header -->
    <div class="page-header">
      <h1>Dashboard</h1>
      <p>Enterprise Technology Catalog Overview</p>
    </div>

    <!-- Quick Navigation -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="block p-4 rounded-lg border border-default bg-default hover:bg-elevated/50 transition-colors text-center"
      >
        <UIcon :name="item.icon" class="w-6 h-6 mx-auto mb-2 text-muted" />
        <p class="text-2xl font-bold" :class="item.valueClass">{{ item.value }}</p>
        <p class="text-sm text-muted mt-1">{{ item.title }}</p>
      </NuxtLink>
    </div>

    <!-- Statistics Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Systems by Criticality -->
      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="font-semibold">Systems by Criticality</h3>
            <NuxtLink to="/systems" class="text-sm text-primary">View all →</NuxtLink>
          </div>
        </template>
        <div class="grid grid-cols-4 gap-2 text-center">
          <div>
            <p class="text-sm text-muted">Critical</p>
            <p class="text-xl font-bold text-error">{{ criticalityCounts.critical }}</p>
          </div>
          <div>
            <p class="text-sm text-muted">High</p>
            <p class="text-xl font-bold text-warning">{{ criticalityCounts.high }}</p>
          </div>
          <div>
            <p class="text-sm text-muted">Medium</p>
            <p class="text-xl font-bold text-success">{{ criticalityCounts.medium }}</p>
          </div>
          <div>
            <p class="text-sm text-muted">Low</p>
            <p class="text-xl font-bold">{{ criticalityCounts.low }}</p>
          </div>
        </div>
      </UCard>

      <!-- Licenses by Category -->
      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="font-semibold">Licenses by Category</h3>
            <NuxtLink to="/licenses" class="text-sm text-primary">View all →</NuxtLink>
          </div>
        </template>
        <div class="grid grid-cols-4 gap-2 text-center">
          <div>
            <p class="text-sm text-muted">Total</p>
            <p class="text-xl font-bold">{{ licenseStats.total }}</p>
          </div>
          <div>
            <p class="text-sm text-muted">Permissive</p>
            <p class="text-xl font-bold text-success">{{ licenseStats.permissive }}</p>
          </div>
          <div>
            <p class="text-sm text-muted">Copyleft</p>
            <p class="text-xl font-bold text-warning">{{ licenseStats.copyleft }}</p>
          </div>
          <div>
            <p class="text-sm text-muted">Denied</p>
            <p class="text-xl font-bold text-error">{{ licenseStats.denied }}</p>
          </div>
        </div>
      </UCard>

      <!-- Policy Violations -->
      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="font-semibold">Policy Violations</h3>
            <NuxtLink to="/violations" class="text-sm text-primary">View all →</NuxtLink>
          </div>
        </template>
        <div class="grid grid-cols-4 gap-2 text-center">
          <div>
            <p class="text-sm text-muted">Total</p>
            <p class="text-xl font-bold text-error">{{ violationStats.total }}</p>
          </div>
          <div>
            <p class="text-sm text-muted">Critical</p>
            <p class="text-xl font-bold text-error">{{ violationStats.critical }}</p>
          </div>
          <div>
            <p class="text-sm text-muted">Error</p>
            <p class="text-xl font-bold text-warning">{{ violationStats.error }}</p>
          </div>
          <div>
            <p class="text-sm text-muted">Warning</p>
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
        to="/docs"
        variant="subtle"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ApiResponse, Technology, System, Component, Policy } from '~~/types/api'

interface LicenseStatsResponse {
  success: boolean
  data: Array<{
    total: number
    osiApproved: number
    byCategory: Record<string, number>
  }>
}

interface DeniedLicensesResponse {
  success: boolean
  deniedLicenses: string[]
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

// Fetch all data
const { data: techData } = await useFetch<ApiResponse<Technology>>('/api/technologies')
const { data: sysData } = await useFetch<ApiResponse<System>>('/api/systems')
const { data: compData } = await useFetch<ApiResponse<Component>>('/api/components')

const { data: policyData } = await useFetch<ApiResponse<Policy>>('/api/policies')
const { data: licenseStatsData } = await useFetch<LicenseStatsResponse>('/api/licenses/statistics')
const { data: deniedLicensesData } = await useFetch<DeniedLicensesResponse>('/api/licenses/denied')
const { data: policyViolationsData } = await useFetch<ViolationsResponse>('/api/policies/violations')
const { data: licenseViolationsData } = await useFetch<{ success: boolean; count: number; total?: number }>('/api/policies/license-violations?limit=1')

// Counts
const techCount = useApiCount(techData)
const sysCount = useApiCount(sysData)
const compCount = useApiCount(compData)

const policyCount = useApiCount(policyData)
const violationsCount = computed(() => policyViolationsData.value?.count || 0)
const licenseViolationsCount = computed(() => licenseViolationsData.value?.total || licenseViolationsData.value?.count || 0)

// Navigation items with counts
const navItems = computed(() => [
  { title: 'Technologies', value: techCount.value, icon: 'i-lucide-settings', to: '/technologies', valueClass: 'text-primary' },
  { title: 'Systems', value: sysCount.value, icon: 'i-lucide-cpu', to: '/systems', valueClass: 'text-success' },
  { title: 'Components', value: compCount.value, icon: 'i-lucide-box', to: '/components', valueClass: 'text-warning' },
  { title: 'Policies', value: policyCount.value, icon: 'i-lucide-file-text', to: '/policies', valueClass: '' },
  { title: 'Violations', value: violationsCount.value, icon: 'i-lucide-alert-triangle', to: '/violations', valueClass: 'text-error' },
  { title: 'License Violations', value: licenseViolationsCount.value, icon: 'i-lucide-scale', to: '/violations/licenses', valueClass: 'text-error' }
])

// System criticality breakdown
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

// License statistics
const licenseStats = computed(() => {
  const statsData = licenseStatsData.value?.data?.[0]
  const deniedCount = deniedLicensesData.value?.deniedLicenses?.length || 0
  return {
    total: statsData?.total || 0,
    permissive: statsData?.byCategory?.permissive || 0,
    copyleft: statsData?.byCategory?.copyleft || 0,
    denied: deniedCount
  }
})

// Violation statistics
const violationStats = computed(() => {
  const data = policyViolationsData.value
  return {
    total: data?.count || 0,
    critical: data?.summary?.critical || 0,
    error: data?.summary?.error || 0,
    warning: data?.summary?.warning || 0
  }
})

useHead({
  title: 'Dashboard - Polaris'
})
</script>
