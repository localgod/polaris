<template>
  <div class="space-y">
    <!-- Loading State -->
    <UiCard v-if="pending">
      <div class="text-center" style="padding: 3rem;">
        <div class="spinner" style="margin: 0 auto;"/>
        <p class="text-muted" style="margin-top: 1rem;">Loading team details...</p>
      </div>
    </UiCard>

    <!-- Error State -->
    <UiCard v-else-if="error">
      <div class="flex items-center" style="gap: 1rem; color: var(--color-error);">
        <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3>Error Loading Team</h3>
          <p class="text-sm">{{ error.message }}</p>
        </div>
      </div>
      <div style="margin-top: 1rem;">
        <NuxtLink to="/teams">← Back to Teams</NuxtLink>
      </div>
    </UiCard>

    <!-- Team Details -->
    <template v-else-if="data?.data">
      <!-- Header -->
      <div class="page-header">
        <NuxtLink to="/teams" style="display: inline-block; margin-bottom: 0.5rem;">← Back to Teams</NuxtLink>
        <h1>{{ data.data.name }}</h1>
        <p v-if="data.data.responsibilityArea">{{ data.data.responsibilityArea }}</p>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-4">
        <UiStatCard label="Technologies Owned" :value="data.data.technologyCount || 0" variant="primary" />
        <UiStatCard label="Systems Owned" :value="data.data.systemCount || 0" variant="success" />
        <UiStatCard label="Technologies Used" :value="data.data.usedTechnologyCount || 0" variant="warning" />
        <UiStatCard label="Members" :value="data.data.memberCount || 0" variant="neutral" />
      </div>

      <!-- Main Info Grid -->
      <div class="grid grid-cols-2">
        <!-- Contact Information -->
        <UiCard>
          <template #header>
            <h2>Contact Information</h2>
          </template>
          <div class="space-y" style="--space: 0.75rem;">
            <div v-if="data.data.email">
              <span class="text-sm text-muted">Email</span>
              <p><a :href="`mailto:${data.data.email}`">{{ data.data.email }}</a></p>
            </div>
            <div v-if="data.data.responsibilityArea">
              <span class="text-sm text-muted">Responsibility Area</span>
              <p class="font-medium">{{ data.data.responsibilityArea }}</p>
            </div>
            <p v-if="!data.data.email && !data.data.responsibilityArea" class="text-muted">
              No contact information available
            </p>
          </div>
        </UiCard>

        <!-- Quick Actions -->
        <UiCard>
          <template #header>
            <h2>Quick Actions</h2>
          </template>
          <div class="space-y" style="--space: 0.5rem;">
            <NuxtLink 
              v-if="data.data.email"
              :to="`mailto:${data.data.email}`" 
              class="btn btn-primary"
              style="display: inline-flex;"
            >
              Contact Team
            </NuxtLink>
            <NuxtLink 
              to="/technologies" 
              class="btn btn-secondary"
              style="display: inline-flex;"
            >
              View All Technologies
            </NuxtLink>
            <NuxtLink 
              to="/systems" 
              class="btn btn-secondary"
              style="display: inline-flex;"
            >
              View All Systems
            </NuxtLink>
          </div>
        </UiCard>
      </div>

      <!-- Owned Technologies -->
      <UiCard v-if="data.data.ownedTechnologies && data.data.ownedTechnologies.length > 0">
        <template #header>
          <h2>Owned Technologies ({{ data.data.ownedTechnologies.length }})</h2>
        </template>
        <div class="space-y" style="--space: 0.5rem;">
          <NuxtLink
            v-for="tech in data.data.ownedTechnologies"
            :key="tech.name"
            :to="`/technologies/${encodeURIComponent(tech.name)}`"
            class="flex justify-between items-center"
            style="padding: 0.75rem; background: #f9fafb; border-radius: 0.375rem; text-decoration: none; color: inherit;"
          >
            <div>
              <span class="font-medium">{{ tech.name }}</span>
              <span v-if="tech.category" class="text-muted text-sm" style="margin-left: 0.5rem;">{{ tech.category }}</span>
            </div>
            <UiBadge v-if="tech.riskLevel" :variant="getRiskVariant(tech.riskLevel)">
              {{ tech.riskLevel }}
            </UiBadge>
          </NuxtLink>
        </div>
      </UiCard>

      <!-- Owned Systems -->
      <UiCard v-if="data.data.ownedSystems && data.data.ownedSystems.length > 0">
        <template #header>
          <h2>Owned Systems ({{ data.data.ownedSystems.length }})</h2>
        </template>
        <div class="space-y" style="--space: 0.5rem;">
          <div
            v-for="system in data.data.ownedSystems"
            :key="system.name"
            class="flex justify-between items-center"
            style="padding: 0.75rem; background: #f9fafb; border-radius: 0.375rem;"
          >
            <div>
              <span class="font-medium">{{ system.name }}</span>
              <span v-if="system.domain" class="text-muted text-sm" style="margin-left: 0.5rem;">{{ system.domain }}</span>
            </div>
            <UiBadge v-if="system.businessCriticality" :variant="getCriticalityVariant(system.businessCriticality)">
              {{ system.businessCriticality }}
            </UiBadge>
          </div>
        </div>
      </UiCard>

      <!-- Team Members -->
      <UiCard v-if="data.data.members && data.data.members.length > 0">
        <template #header>
          <h2>Team Members ({{ data.data.members.length }})</h2>
        </template>
        <div class="space-y" style="--space: 0.5rem;">
          <div
            v-for="member in data.data.members"
            :key="member.email"
            class="flex justify-between items-center"
            style="padding: 0.75rem; background: #f9fafb; border-radius: 0.375rem;"
          >
            <div>
              <span class="font-medium">{{ member.name || member.email }}</span>
              <span v-if="member.name" class="text-muted text-sm" style="margin-left: 0.5rem;">{{ member.email }}</span>
            </div>
            <UiBadge :variant="member.role === 'superuser' ? 'error' : 'neutral'">
              {{ member.role }}
            </UiBadge>
          </div>
        </div>
      </UiCard>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()

interface TeamMember {
  email: string
  name: string | null
  role: string
}

interface OwnedTechnology {
  name: string
  category: string | null
  riskLevel: string | null
}

interface OwnedSystem {
  name: string
  domain: string | null
  businessCriticality: string | null
}

interface TeamDetail {
  name: string
  email: string | null
  responsibilityArea: string | null
  technologyCount: number
  systemCount: number
  usedTechnologyCount?: number
  memberCount?: number
  ownedTechnologies?: OwnedTechnology[]
  ownedSystems?: OwnedSystem[]
  members?: TeamMember[]
}

interface TeamDetailResponse {
  success: boolean
  data: TeamDetail
  error?: string
}

const { data, pending, error } = await useFetch<TeamDetailResponse>(() => `/api/teams/${encodeURIComponent(route.params.name as string)}`)

function getRiskVariant(riskLevel: string): 'success' | 'warning' | 'error' | 'neutral' {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    low: 'success',
    medium: 'warning',
    high: 'error',
    critical: 'error'
  }
  return variants[riskLevel?.toLowerCase()] || 'neutral'
}

function getCriticalityVariant(criticality: string): 'success' | 'warning' | 'error' | 'neutral' {
  const variants: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
    low: 'neutral',
    medium: 'warning',
    high: 'error',
    critical: 'error'
  }
  return variants[criticality?.toLowerCase()] || 'neutral'
}

useHead({
  title: computed(() => data.value?.data ? `${data.value.data.name} - Polaris` : 'Team - Polaris')
})
</script>
