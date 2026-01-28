<template>
  <NuxtLayout name="default">
    <div class="space-y">
      <!-- Header -->
      <div>
        <h1>Dashboard</h1>
        <p class="text-muted" style="margin-top: 0.5rem;">Enterprise Technology Catalog Overview</p>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-6">
        <NuxtLink to="/technologies" style="text-decoration: none;">
          <UiStatCard label="Technologies" :value="stats.technologies || '—'" variant="primary" />
        </NuxtLink>
        <NuxtLink to="/systems" style="text-decoration: none;">
          <UiStatCard label="Systems" :value="stats.systems || '—'" variant="success" />
        </NuxtLink>
        <NuxtLink to="/components" style="text-decoration: none;">
          <UiStatCard label="Components" :value="stats.components || '—'" variant="warning" />
        </NuxtLink>
        <NuxtLink to="/teams" style="text-decoration: none;">
          <UiStatCard label="Teams" :value="stats.teams || '—'" variant="neutral" />
        </NuxtLink>
        <NuxtLink to="/policies" style="text-decoration: none;">
          <UiStatCard label="Policies" :value="stats.policies || '—'" variant="neutral" />
        </NuxtLink>
        <NuxtLink to="/violations/licenses" style="text-decoration: none;">
          <UiStatCard label="License Violations" :value="stats.licenseViolations || '—'" variant="error" />
        </NuxtLink>
      </div>

      <!-- Quick Actions -->
      <div class="grid grid-cols-3">
        <UiCard>
          <template #header>
            <h3>Technologies</h3>
          </template>
          <p class="text-muted" style="margin-bottom: 1rem;">Browse approved technologies, versions, and compliance status</p>
          <NuxtLink to="/technologies">View Technologies →</NuxtLink>
        </UiCard>

        <UiCard>
          <template #header>
            <h3>Systems</h3>
          </template>
          <p class="text-muted" style="margin-bottom: 1rem;">View deployable applications and their dependencies</p>
          <NuxtLink to="/systems">View Systems →</NuxtLink>
        </UiCard>

        <UiCard>
          <template #header>
            <h3>Violations</h3>
          </template>
          <p class="text-muted" style="margin-bottom: 1rem;">View technologies used without approval</p>
          <NuxtLink to="/violations">View Violations →</NuxtLink>
        </UiCard>
      </div>

      <!-- Additional Links -->
      <UiCard>
        <template #header>
          <h3>More Resources</h3>
        </template>
        <div class="grid grid-cols-3">
          <NuxtLink to="/components" style="display: block; padding: 1rem; border: 1px solid var(--color-border); border-radius: 0.5rem; text-decoration: none; color: inherit;">
            <strong>Components</strong>
            <p class="text-sm text-muted">SBOM entries</p>
          </NuxtLink>
          <NuxtLink to="/teams" style="display: block; padding: 1rem; border: 1px solid var(--color-border); border-radius: 0.5rem; text-decoration: none; color: inherit;">
            <strong>Teams</strong>
            <p class="text-sm text-muted">Team ownership</p>
          </NuxtLink>
          <NuxtLink to="/docs" style="display: block; padding: 1rem; border: 1px solid var(--color-border); border-radius: 0.5rem; text-decoration: none; color: inherit;">
            <strong>Documentation</strong>
            <p class="text-sm text-muted">Learn more</p>
          </NuxtLink>
        </div>
      </UiCard>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { ApiResponse, Technology, System, Component, Team, Policy } from '~~/types/api'

interface LicenseViolationsResponse {
  success: boolean
  count: number
  total?: number
}

const { data: techData } = await useFetch<ApiResponse<Technology>>('/api/technologies')
const { data: sysData } = await useFetch<ApiResponse<System>>('/api/systems')
const { data: compData } = await useFetch<ApiResponse<Component>>('/api/components')
const { data: teamData } = await useFetch<ApiResponse<Team>>('/api/teams')
const { data: policyData } = await useFetch<ApiResponse<Policy>>('/api/policies')
const { data: violationsData } = await useFetch<LicenseViolationsResponse>('/api/policies/license-violations?limit=1')

const techCount = useApiCount(techData)
const sysCount = useApiCount(sysData)
const compCount = useApiCount(compData)
const teamCount = useApiCount(teamData)
const policyCount = useApiCount(policyData)
const violationsCount = computed(() => violationsData.value?.total || violationsData.value?.count || 0)

const stats = computed(() => ({
  technologies: techCount.value,
  systems: sysCount.value,
  components: compCount.value,
  teams: teamCount.value,
  policies: policyCount.value,
  licenseViolations: violationsCount.value
}))

useHead({
  title: 'Dashboard - Polaris'
})
</script>
