<template>
  <NuxtLayout name="default">
    <div class="space-y-6">
      <!-- Header -->
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Enterprise Technology Catalog Overview
        </p>
      </div>

      <!-- Database Status -->
      <UiCard v-if="dbStatus">
        <div class="flex items-center gap-4">
          <div 
            class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
            :class="dbStatus.status === 'online' ? 'bg-success-100 dark:bg-success-900/30' : 'bg-error-100 dark:bg-error-900/30'"
          >
            <svg 
              v-if="dbStatus.status === 'online'" 
              class="w-6 h-6 text-success-600 dark:text-success-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <svg 
              v-else 
              class="w-6 h-6 text-error-600 dark:text-error-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-semibold" :class="dbStatus.status === 'online' ? 'text-success-900 dark:text-success-400' : 'text-error-900 dark:text-error-400'">
              Database {{ dbStatus.status === 'online' ? 'Connected' : 'Disconnected' }}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">{{ dbStatus.message }}</p>
          </div>
        </div>
      </UiCard>

      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <NuxtLink to="/technologies" class="block">
          <UiStatCard
            label="Technologies"
            :value="stats.technologies || '—'"
            variant="primary"
          />
        </NuxtLink>

        <NuxtLink to="/systems" class="block">
          <UiStatCard
            label="Systems"
            :value="stats.systems || '—'"
            variant="success"
          />
        </NuxtLink>

        <NuxtLink to="/components" class="block">
          <UiStatCard
            label="Components"
            :value="stats.components || '—'"
            variant="warning"
          />
        </NuxtLink>

        <NuxtLink to="/teams" class="block">
          <UiStatCard
            label="Teams"
            :value="stats.teams || '—'"
            variant="error"
          />
        </NuxtLink>
      </div>

      <!-- Quick Actions -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <UiCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <svg class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Technologies</h3>
            </div>
          </template>
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Browse approved technologies, versions, and compliance status
          </p>
          <NuxtLink 
            to="/technologies" 
            class="inline-flex items-center text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          >
            View Technologies
            <svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </NuxtLink>
        </UiCard>

        <UiCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                <svg class="w-5 h-5 text-success-600 dark:text-success-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Systems</h3>
            </div>
          </template>
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
            View deployable applications and their dependencies
          </p>
          <NuxtLink 
            to="/systems" 
            class="inline-flex items-center text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          >
            View Systems
            <svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </NuxtLink>
        </UiCard>

        <UiCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
                <svg class="w-5 h-5 text-warning-600 dark:text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Violations</h3>
            </div>
          </template>
          <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
            View technologies used without approval
          </p>
          <NuxtLink 
            to="/violations" 
            class="inline-flex items-center text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
          >
            View Violations
            <svg class="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </NuxtLink>
        </UiCard>
      </div>

      <!-- Additional Links -->
      <UiCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">More Resources</h3>
        </template>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NuxtLink 
            to="/components" 
            class="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors"
          >
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <div>
              <p class="font-medium text-gray-900 dark:text-white">Components</p>
              <p class="text-sm text-gray-500 dark:text-gray-300">SBOM entries</p>
            </div>
          </NuxtLink>

          <NuxtLink 
            to="/teams" 
            class="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors"
          >
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div>
              <p class="font-medium text-gray-900 dark:text-white">Teams</p>
              <p class="text-sm text-gray-500 dark:text-gray-300">Team ownership</p>
            </div>
          </NuxtLink>

          <NuxtLink 
            to="/docs" 
            class="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors"
          >
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <div>
              <p class="font-medium text-gray-900 dark:text-white">Documentation</p>
              <p class="text-sm text-gray-500 dark:text-gray-300">Learn more</p>
            </div>
          </NuxtLink>
        </div>
      </UiCard>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { ApiResponse, Technology, System, Component, Team } from '~~/types/api'

const { data: dbStatus } = await useFetch('/api/db-status')

// Fetch stats using useFetch for SSR support
const { data: techData } = await useFetch<ApiResponse<Technology>>('/api/technologies')
const { data: sysData } = await useFetch<ApiResponse<System>>('/api/systems')
const { data: compData } = await useFetch<ApiResponse<Component>>('/api/components')
const { data: teamData } = await useFetch<ApiResponse<Team>>('/api/teams')

// Extract counts using composable
const techCount = useApiCount(techData)
const sysCount = useApiCount(sysData)
const compCount = useApiCount(compData)
const teamCount = useApiCount(teamData)

// Compute stats from fetched data
const stats = computed(() => ({
  technologies: techCount.value,
  systems: sysCount.value,
  components: compCount.value,
  teams: teamCount.value
}))

useHead({
  title: 'Dashboard - Polaris'
})
</script>
